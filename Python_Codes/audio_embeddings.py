import numpy as np
import soundfile as sf
from pathlib import Path
import noisereduce as nr
from scipy import signal
from transformers import pipeline
import torch
import torchaudio.transforms as T
import subprocess
import tempfile
import os
from sentence_transformers import SentenceTransformer
import warnings
from config import FFMPEG_PATH

warnings.filterwarnings("ignore")

class AudioVectorizer:
    def __init__(self, hf_asr_model="openai/whisper-base"): 
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.asr_enabled = os.getenv("PIPELINE_DISABLE_ASR", "false").lower() not in {"1", "true", "yes"}
        # A local Hugging Face snapshot path is useful for fully offline runs
        # (and avoids re-downloading a model that is already present).
        self.asr_model_name = os.getenv("HF_ASR_MODEL", hf_asr_model)
        print(f"Using device: {self.device}")

        self.transcription_model = None
        if self.asr_enabled:
            print(f"Loading HF ASR model ({self.asr_model_name})...")
            self.transcription_model = pipeline(
                "automatic-speech-recognition",
                model=self.asr_model_name,
                device=self.device
            )
            print("HF ASR (Whisper) model loaded successfully.")
        else:
            print("ASR disabled for this local smoke run; transcript text will be empty.")

        print("Loading text embedding model (all-MiniLM-L6-v2)...")
        self.embedding_model = SentenceTransformer("all-MiniLM-L6-v2", device=self.device)
        print("Text embedding model loaded successfully.")
        print("Models loaded successfully.")

    def load_audio(self, audio_path):
        file_ext = Path(audio_path).suffix.lower()
        
        tmp_path = None
        try:
            if file_ext not in ['.wav', '.flac']:
                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
                    tmp_path = tmp_file.name
                
                command = [
                    FFMPEG_PATH,  # resolved from FFMPEG_PATH env var or system PATH (see config.py)
                    '-i', str(audio_path),
                    '-vn',
                    '-acodec', 'pcm_s16le',
                    '-ar', '16000', # Resample to the 16kHz needed by Whisper
                    '-ac', '1',      # Force mono
                    '-y',
                    tmp_path
                ]
                
                try:
                    subprocess.run(command, capture_output=True, text=True, check=True, encoding='utf-8')
                except subprocess.CalledProcessError as e:
                    print(f"FFmpeg failed to convert {audio_path}.")
                    print("FFmpeg stderr:", e.stderr)
                    raise IOError("FFmpeg conversion failed.") from e
                
                audio, sr = sf.read(tmp_path)
                
            else:
                # Load standard audio files directly
                audio, sr = sf.read(audio_path)
        
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)
        
        # Ensure mono
        if len(audio.shape) > 1:
            audio = np.mean(audio, axis=1)
            
        # Ensure 16kHz if it's a WAV/FLAC that wasn't 16k
        if sr != 16000:
            print(f"Resampling from {sr} Hz to 16000 Hz...")
            resampler = T.Resample(sr, 16000)
            audio = resampler(torch.from_numpy(audio).float()).numpy()
            sr = 16000
            
        return audio, sr
    
    def clean_audio(self, audio, sr):
        audio = nr.reduce_noise(y=audio, sr=sr, stationary=True)
        sos = signal.butter(5, 80, 'hp', fs=sr, output='sos')
        audio = signal.sosfilt(sos, audio)
        max_val = np.abs(audio).max()
        if max_val > 1e-8:
            audio = audio / max_val
        
        return audio
    
    def split_audio(self, audio, sr, segment_length=10):
        segment_samples = int(segment_length * sr)
        segments = []
        
        for start in range(0, len(audio), segment_samples):
            end = min(start + segment_samples, len(audio))
            segment = audio[start:end]
            
            if len(segment) < segment_samples and len(segment) > 0:
                segment = np.pad(segment, (0, segment_samples - len(segment)))
            
            if len(segment) == segment_samples:
                segments.append(segment)
                
        return segments
    
    def resample_audio(self, audio_tensor, orig_sr, target_sr):
        audio_tensor = audio_tensor.to(self.device)
        
        resampler = T.Resample(orig_sr, target_sr).to(self.device)
        resampled = resampler(audio_tensor)
        return resampled
    
    def get_transcript_embedding(self, audio_segment, sample_rate):
        text = ""    
        if self.transcription_model is not None:
            print("       Transcribing segment with Whisper...")
            result = self.transcription_model(
                audio_segment, 
                generate_kwargs={"task": "transcribe"}
            )
            text = result["text"].strip().upper()
        else:
            print("       Skipping transcription (offline smoke mode)...")
        print(f"         Transcription: '{text}'")
        print(f"         Generating text embedding...")
        embedding = self.embedding_model.encode(text)
        print(f"           Embedding generated (Shape: {embedding.shape}).")
        return text, embedding

