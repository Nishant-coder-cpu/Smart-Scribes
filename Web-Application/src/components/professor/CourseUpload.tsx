import React from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { FileAudio, FileVideo, Hash, Calendar } from "lucide-react";
import { Course } from "../../types/index";

/** Fired after a job is queued so the processing status card refreshes. */
export const LECTURE_JOB_QUEUED_EVENT = "lecture-job-queued";

// fetch() cannot report upload progress, so PUT the file with XMLHttpRequest.
function putFileWithProgress(uploadUrl: string, file: File, onProgress: (loaded: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    if (file.type) xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload to cloud storage failed (HTTP ${xhr.status})`));
    xhr.onerror = () => reject(new Error("Network error while uploading to cloud storage"));
    xhr.send(file);
  });
}

interface CourseUploadProps {
  selectedCourse: Course;
  lectureNumber: string;
  setLectureNumber: (value: string) => void;
  lectureDate: string;
  setLectureDate: (value: string) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: "slides" | "audio" | "video") => void;
  onLectureQueued: (lecture: { lectureNumber: string; date: string; audioFile: string; videoFile: string }) => void;
  pendingAudioFile: File | null;
  pendingVideoFile: File | null;
}

export function CourseUpload({
  selectedCourse,
  lectureNumber,
  setLectureNumber,
  lectureDate,
  setLectureDate,
  handleFileUpload,
  onLectureQueued,
  pendingAudioFile,
  pendingVideoFile,
}: CourseUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadPercent, setUploadPercent] = React.useState<number | null>(null);

  const canUploadBoth = Boolean(
    selectedCourse.materials?.audio &&
    selectedCourse.materials?.video &&
    lectureNumber &&
    lectureDate
  );

  const handleUploadBoth = async () => {
    if (!canUploadBoth) return;
    const audioFile = pendingAudioFile;
    const videoFile = pendingVideoFile;
    if (!audioFile || !videoFile) {
      alert("Please choose both audio and video files.");
      return;
    }
    const lectureNum = Number(lectureNumber);
    if (!Number.isInteger(lectureNum) || lectureNum <= 0) {
      alert("Lecture number must be a positive whole number.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadPercent(0);

      // Direct-to-GCS resumable uploads for audio and video
      async function initResumable(kind: 'audio' | 'video', file: File) {
        const initRes = await fetch('/api/upload/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: selectedCourse.id,
            lectureNumber: String(lectureNum),
            lectureDate,
            kind,
            filename: file.name,
            type: file.type,
          }),
        });
        if (!initRes.ok) {
          const e = await initRes.json().catch(() => ({} as any));
          throw new Error((e as any).error || 'Failed to initialize upload');
        }
        return initRes.json() as Promise<{
          uploadUrl: string;
          bucketName: string;
          destinationPath: string;
          pathPrefix: string;
        }>;
      }

      const [audioInit, videoInit] = await Promise.all([
        initResumable('audio', audioFile),
        initResumable('video', videoFile),
      ]);

      const totalBytes = audioFile.size + videoFile.size || 1;
      const loaded = { audio: 0, video: 0 };
      const report = () => setUploadPercent(Math.round(((loaded.audio + loaded.video) / totalBytes) * 100));
      await Promise.all([
        putFileWithProgress(audioInit.uploadUrl, audioFile, (n) => { loaded.audio = n; report(); }),
        putFileWithProgress(videoInit.uploadUrl, videoFile, (n) => { loaded.video = n; report(); }),
      ]);

      const toUrl = (bucket: string, p: string) =>
        `https://storage.googleapis.com/${bucket}/${p.split('/').map(encodeURIComponent).join('/')}`;
      const audioUrl = toUrl(audioInit.bucketName, audioInit.destinationPath);
      const videoUrl = toUrl(videoInit.bucketName, videoInit.destinationPath);

      // Queue the job for the Python worker (it only picks up 'pending' jobs).
      // The API also creates the lecture row if it does not exist yet.
      const jobRes = await fetch('/api/jobs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          lectureNumber: lectureNum,
          lectureDate,
          audioUrl,
          videoUrl,
        }),
      });
      if (!jobRes.ok) {
        const e = await jobRes.json().catch(() => ({} as any));
        throw new Error(
          `Files were uploaded, but queuing processing failed: ${(e as any).error || jobRes.statusText}`
        );
      }

      window.dispatchEvent(new CustomEvent(LECTURE_JOB_QUEUED_EVENT));
      onLectureQueued({ lectureNumber: String(lectureNum), date: lectureDate, audioFile: audioUrl, videoFile: videoUrl });
      alert(`✅ Lecture ${lectureNum} uploaded and queued for processing.`);
    } catch (e: any) {
      alert(e.message || "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadPercent(null);
    }
  };
  return (
    <Card className="p-8 shadow-md border border-gray-200 bg-white rounded-2xl">
      <h2 className="text-2xl font-semibold mb-6 text-center text-purple-700">
        Generate Lecture Content
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {/* Audio Upload */}
        <div className="flex flex-col items-center p-6 border rounded-lg hover:shadow-lg transition-all">
          <FileAudio className="w-8 h-8 mb-3 text-blue-600" />
          <h3 className="font-medium mb-2">Upload Audio</h3>
          <input
            type="file"
            accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4"
            className="hidden"
            id="upload-audio"
            onChange={(e) => handleFileUpload(e, "audio")}
          />
          <Button
            variant="outline"
            className="bg-blue-50 hover:bg-blue-100"
            onClick={() =>
              document.getElementById("upload-audio")?.click()
            }
          >
            Choose File
          </Button>
          {selectedCourse.materials?.audio && (
            <div className="mt-4 w-full">
              <p className="text-xs font-semibold text-gray-600 mb-1">Current:</p>
              <p className="text-xs text-gray-700 truncate">
                🎵 {selectedCourse.materials.audio}
              </p>
            </div>
          )}
        </div>

        {/* Video Upload */}
        <div className="flex flex-col items-center p-6 border rounded-lg hover:shadow-lg transition-all">
          <FileVideo className="w-8 h-8 mb-3 text-green-600" />
          <h3 className="font-medium mb-2">Upload Video</h3>
          <input
            type="file"
            accept=".mp4,.mov,.mkv,.webm,video/mp4,video/quicktime,video/webm"
            className="hidden"
            id="upload-video"
            onChange={(e) => handleFileUpload(e, "video")}
          />
          <Button
            variant="outline"
            className="bg-green-50 hover:bg-green-100"
            onClick={() =>
              document.getElementById("upload-video")?.click()
            }
          >
            Choose File
          </Button>
          {selectedCourse.materials?.video && (
            <div className="mt-4 w-full">
              <p className="text-xs font-semibold text-gray-600 mb-1">Current:</p>
              <p className="text-xs text-gray-700 truncate">
                🎬 {selectedCourse.materials.video}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Both to Cloud */}
      {selectedCourse.materials?.audio && selectedCourse.materials?.video && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-center mb-4 text-gray-700">Upload to Cloud</h3>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Hash className="text-purple-600" />
              <Input
                type="number"
                min={1}
                step={1}
                placeholder="Lecture Number"
                value={lectureNumber}
                onChange={(e) => setLectureNumber(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Calendar className="text-purple-600" />
              <Input
                type="date"
                value={lectureDate}
                onChange={(e) => setLectureDate(e.target.value)}
              />
            </div>
            <Button onClick={handleUploadBoth} disabled={!canUploadBoth || isUploading} className="bg-purple-600 hover:bg-purple-700 text-white px-6">
              {isUploading
                ? uploadPercent !== null && uploadPercent < 100
                  ? `Uploading ${uploadPercent}%`
                  : "Queuing..."
                : "Process Lecture Content"}
            </Button>
          </div>
          {uploadPercent !== null && (
            <div className="mt-4 h-2 w-full rounded-full bg-purple-100 overflow-hidden">
              <div
                className="h-full bg-purple-600 transition-all"
                style={{ width: `${uploadPercent}%` }}
              />
            </div>
          )}
        </div>
      )}

      
    </Card>
  );
}