import numpy as np
import torch
from pathlib import Path
from tqdm import tqdm 
import sys
from frames_embeddings import VideoTextExtractor
from audio_embeddings import AudioVectorizer
from pipeline_functions import *
from MultiModal.generate import *
from MultiModal.pdf_embedding import *
from MultiModal.lecture_to_bookmatch import *
import json
from manim2 import *
from google_storage_code import *
import os
import shutil
from create_json import *
from lastjson import *
from cleaning import *
from UploadTOFrontend import *
import traceback
import config


local_dir_audio = "audio_full" 
local_dir_video = "video_full"
OUTPUT_FUSED_FILE = "fused_final.npy"
OUTPUT_AUDIO_FILE = "audio_embeddings.npy"
OUTPUT_VIDEO_FILE = "video_embeddings.npy"
FULL_JSON = "full_data.json"
VIDEO_DIM = 384
AUDIO_DIM = 384
BUCKET_NAME = config.BUCKET_NAME


def resolve_input_files(task):
    """Resolve source media without downloading when local paths are supplied.

    Production workers continue to download from GCS.  Local smoke runs set all
    three ``PIPELINE_LOCAL_*`` variables, which avoids clearing or downloading
    already-available demo assets on every retry.
    """
    local_audio = os.getenv("PIPELINE_LOCAL_AUDIO")
    local_video = os.getenv("PIPELINE_LOCAL_VIDEO")
    local_book = os.getenv("PIPELINE_LOCAL_BOOK")
    supplied = [local_audio, local_video, local_book]

    if any(supplied):
        if not all(supplied):
            raise RuntimeError(
                "Set PIPELINE_LOCAL_AUDIO, PIPELINE_LOCAL_VIDEO and "
                "PIPELINE_LOCAL_BOOK together, or set none to use GCS."
            )
        missing = [path for path in supplied if not os.path.isfile(path)]
        if missing:
            raise FileNotFoundError(f"Local pipeline input not found: {missing}")
        os.makedirs(config.BOOK_DIR, exist_ok=True)
        # BookEmbeddingProcessor has a canonical book path; copying only the
        # small PDF keeps its downstream contract unchanged.
        if os.path.abspath(local_book) != os.path.abspath(config.BOOK_PDF_PATH):
            shutil.copy2(local_book, config.BOOK_PDF_PATH)
        print("Using local audio, video and PDF inputs; GCS download skipped.")
        return local_audio, local_video, True

    download_lecture_files(BUCKET_NAME, task[0], task[1])
    has_book = download_book(BUCKET_NAME, task[0], task[1])
    file_video = os.listdir(local_dir_video)
    file_audio = os.listdir(local_dir_audio)
    if not file_video or not file_audio:
        raise RuntimeError(
            f"Lecture {task} is missing audio or video (audio={file_audio}, video={file_video})"
        )
    return (
        os.path.join(local_dir_audio, file_audio[0]),
        os.path.join(local_dir_video, file_video[0]),
        has_book,
    )


# Heavy models (Whisper, TrOCR, BLIP, ...) are loaded once per process and
# reused for every job the worker picks up, instead of being reloaded per lecture.
_models = {}


def get_models():
    if not _models:
        print("\nLoading all models... (This may take a moment)")
        _models["video"] = VideoTextExtractor()
        _models["audio"] = AudioVectorizer()
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"All models loaded successfully. Using device: {device}")
    return _models["video"], _models["audio"]

def run_pipeline(task, progress_callback=None):
    if progress_callback:
        progress_callback(5, "Downloading lecture files")
    AUDIO_SNIPPET_FILE, VIDEO_SNIPPET_FILE, has_book = resolve_input_files(task)

    video_extractor, audio_vectorizer = get_models()

        # --- 5. Pre-process Audio & Video ---
    if progress_callback:
        progress_callback(15, "Pre-processing audio")
    print("\nPre-processing audio...")
    audio, sr = audio_vectorizer.load_audio(AUDIO_SNIPPET_FILE)
    cleaned_audio = audio_vectorizer.clean_audio(audio,sr)
    audio_segments = audio_vectorizer.split_audio(cleaned_audio, sr)
    print(f"Audio pre-processed into {len(audio_segments)} 10-second segments.")

    print("\nPre-processing video...")
    frame_folder = preprocess_video_with_ffmpeg(VIDEO_SNIPPET_FILE, target_fps=0.2)
    frame_gen = load_frames_from_folder(frame_folder)
    video_batches = list(create_batches(frame_gen, batch_size=2))
    print(f"Video pre-processed into {len(video_batches)} 2-frame batches.")
                
    num_segments = min(len(video_batches), len(audio_segments))
    if num_segments == 0:
        raise RuntimeError("No segments found to process.")
                    
    if progress_callback:
        progress_callback(30, f"Starting full processing for {num_segments} segments")
    print(f"\n--- Starting full processing for {num_segments} segments ---")

    fused_vectors = []  # List to collect fused vectors
    audio_embeddings_all = []  # Store audio vectors
    video_embeddings = []  # Store video vectors

    audio_data = {}

    for i in tqdm(range(num_segments), desc="Processing & Fusing Segments"):
        video_batch = video_batches[i]
        audio_segment = audio_segments[i]
                    
        text_fragments, image_captions = video_extractor.extract_info_from_batch(video_batch)
        cleaned_text = video_extractor.combine_and_clean_info(text_fragments, image_captions)
        print(cleaned_text)
                    
        if cleaned_text:
                video_vec_np = video_extractor.get_text_embedding(cleaned_text)
        else:
                video_vec_np = np.zeros(VIDEO_DIM) 
                
        audio_text_new, audio_embeddings = audio_vectorizer.get_transcript_embedding(audio_segment,sr)
            
        audio_vec_np = np.array(audio_embeddings)
        v_interaction = audio_vec_np * video_vec_np
        v_fused = np.concatenate((audio_vec_np, video_vec_np, v_interaction))
            
        fused_vectors.append(v_fused)
        audio_embeddings_all.append(audio_vec_np)
        video_embeddings.append(video_vec_np)

        audio_data[f"segment_{i+1}"] = {
                "transcript": audio_text_new.strip(),
                "video_text": cleaned_text.strip(),
        }

    with open(FULL_JSON, "w", encoding="utf-8") as f:
        json.dump(audio_data, f, ensure_ascii=False, indent=4)

    np.save(OUTPUT_FUSED_FILE, np.stack(fused_vectors))
    np.save(OUTPUT_AUDIO_FILE, np.stack(audio_embeddings_all))
    np.save(OUTPUT_VIDEO_FILE, np.stack(video_embeddings))

    clean_transcript_file(
    input_path="full_data.json",
    output_path="full_data.json"
    )

    clean_directory("output/book_images")

    if has_book:
        book_processor = BookEmbeddingProcessor()
        chunks = book_processor.chunk_and_embed_book(
                config.BOOK_PDF_PATH,
                config.BOOK_NAME
        )
        book_processor.save_book_embeddings(chunks, config.BOOK_EMBEDDINGS_PATH)
        print(f"✅ Book embeddings created: {len(chunks)} chunks")
    else:
        print("⚠️ No course PDF found; continuing without textbook references.")

        # Step 2: Match lecture segments
    if progress_callback:
        progress_callback(50, "Matching lecture with book content")
    print("\n" + "=" * 80)
    print("Step 2: Matching lecture with book content...")
    print("=" * 80)
    matcher = LectureBookMatcher(
            similarity_threshold=float(os.getenv("BOOK_MATCH_SIMILARITY_THRESHOLD", "0.3")),
            seconds_per_embedding=10,
            segment_duration_minutes=5
    )
    if has_book:
        matcher.load_book_database(config.BOOK_EMBEDDINGS_PATH)

    matcher.load_full_data(FULL_JSON)

    segment_matches = matcher.process_lecture_segments(
            fused_embeddings_path="fused_final.npy",
            video_embeddings_path="video_embeddings.npy",
            audio_embeddings_path=OUTPUT_AUDIO_FILE,
            audio_weight=float(os.getenv("BOOK_MATCH_AUDIO_WEIGHT", "0.7")),
    )

    with open("lecture_book_matches.json", 'w', encoding='utf-8') as f:
            json.dump(segment_matches, f, indent=2)

    print(f"✅ Matched {len(segment_matches)} segments with book content")

    if progress_callback:
        progress_callback(65, "Generating comprehensive lecture document")
    print("\n" + "=" * 80)
    print("Step 3: Generating comprehensive lecture document...")
    print("=" * 80)
    doc_generator = LectureDocumentGenerator()
    final_document = doc_generator.generate_full_document(
            segment_matches,
            output_path="all_data.txt"
    )

    # Local model verification should be able to complete without invoking
    # remote LLMs, long animation renders, or cloud publishing.  The default
    # remains the full production flow; opt in only for local core runs.
    if os.getenv("PIPELINE_LOCAL_CORE_ONLY", "false").lower() in {"1", "true", "yes"}:
        print("Local core pipeline completed; animation, Gemini, and publish stages skipped.")
        return

    clean_directory("smart_scribes_animations")

    if progress_callback:
        progress_callback(75, "Generating animations from lecture")

    file = "all_data.txt"    
    agent = SmartScribesUltimateAgent()
    result = agent.generate_animations_from_lecture(file)
    if result['success']:
            print("\n✨ Done! Check smart_scribes_animations/")

    

    if progress_callback:
        progress_callback(90, "Structuring lecture topics")

    processor = LectureProcessor("all_data.txt")
    processor.run()

    summary_path = "final.json"
    animations_path = "results.json"
    output_path = Path(summary_path).with_name("merged_all_in_one_gemini.json")

    gemini_merge_all(summary_path, animations_path, output_path)

    if progress_callback:
        progress_callback(95, "Uploading results")

    update_json_and_upload_video(BUCKET_NAME,task[0],task[1])
    create_json_and_upload_images(BUCKET_NAME,task[0],task[1])
    add_overall_url()
    add_overall_id(task[0],task[1])
    rename_json_file() 
    convert_dict_json_to_array_json()
    run_code(
        create_missing_lectures=True,
        course_id=task[0],
        lecture_number=config.lecture_number_from_folder(task[1]),
    )

def run_main():
    tasks = get_course_lectures(BUCKET_NAME, max_files=2)
    failed = []
    for task in tasks:
        try:
            run_pipeline(task)
        except Exception:
            # Keep going so one broken lecture does not block the rest.
            print(f"\n❌ Pipeline failed for {task}:")
            traceback.print_exc()
            failed.append(task)
    print(f"\nProcessed {len(tasks) - len(failed)}/{len(tasks)} lectures successfully.")
    if failed:
        print(f"Failed: {failed}")
        sys.exit(1)


if __name__ == "__main__":
    run_main()
