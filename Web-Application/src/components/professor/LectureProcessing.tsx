import React, { useState, useEffect, useCallback } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { getLectures, getLatestProcessingJobs, retryLectureProcessing } from "../../lib/api";
import { Lecture, LectureProcessing as LectureProcessingType } from "../../types";
import { LECTURE_JOB_QUEUED_EVENT } from "./CourseUpload";

interface LectureProcessingProps {
  courseId: string;
}

// The worker updates rows every few seconds; poll at a similar pace while busy.
const POLL_INTERVAL_MS = 5000;
const ACTIVE_STATUSES = new Set(["pending", "uploading", "processing", "generating"]);

export function LectureProcessing({ courseId }: LectureProcessingProps) {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [processingItems, setProcessingItems] = useState<LectureProcessingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const lecturesData = await getLectures(courseId);
      setLectures(lecturesData);
      const jobs = await getLatestProcessingJobs(lecturesData.map((l) => l.id));
      jobs.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setProcessingItems(jobs);
    } catch (error) {
      console.error("Error fetching lecture processing data:", error);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    fetchData();
    const onQueued = () => fetchData();
    window.addEventListener(LECTURE_JOB_QUEUED_EVENT, onQueued);
    return () => window.removeEventListener(LECTURE_JOB_QUEUED_EVENT, onQueued);
  }, [courseId, fetchData]);

  const hasActiveJobs = processingItems.some((item) => ACTIVE_STATUSES.has(item.status));
  useEffect(() => {
    if (!hasActiveJobs) return;
    const timer = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [hasActiveJobs, fetchData]);

  const handleRetry = async (item: LectureProcessingType) => {
    try {
      setRetryingId(item.id);
      await retryLectureProcessing(item.id);
      await fetchData();
    } catch (error: any) {
      alert(error?.message || "Could not re-queue this lecture");
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
      case 'uploading':
        return "bg-blue-100 text-blue-800";
      case 'processing':
        return "bg-yellow-100 text-yellow-800";
      case 'generating':
        return "bg-purple-100 text-purple-800";
      case 'completed':
        return "bg-green-100 text-green-800";
      case 'failed':
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return "Queued — waiting for the worker";
      case 'uploading':
        return "Uploading";
      case 'processing':
        return "Processing in Pipeline";
      case 'generating':
        return "Generating Content";
      case 'completed':
        return "Pushed on Website";
      case 'failed':
        return "Failed";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Card className="p-6 shadow-md">
        <div className="animate-pulse flex flex-col space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-8 shadow-md border border-gray-200 bg-white rounded-2xl">
      <h2 className="text-2xl font-semibold mb-6 text-center text-purple-700">
        Lecture Processing Status
      </h2>

      {processingItems.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-500">
            No lectures have been processed yet. Upload audio and video above to start.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {processingItems.map(item => {
            const lecture = lectures.find(l => l.id === item.lectureId);
            const progress = Math.max(0, Math.min(100, item.progress ?? 0));
            const isActive = ACTIVE_STATUSES.has(item.status);
            return (
              <div
                key={item.id}
                className="border rounded-lg p-4 bg-gray-50 hover:shadow-sm transition-all"
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-purple-700">
                    {lecture ? `Lecture ${lecture.number}` : 'Unknown Lecture'}
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(item.status)}`}
                  >
                    {getStatusText(item.status)}
                  </span>
                </div>

                {isActive && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{item.stage || "Waiting"}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-purple-100 overflow-hidden">
                      <div className="h-full bg-purple-600 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                {item.status === 'failed' && item.error && (
                  <p className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2 break-words">
                    {item.error}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-3">
                  {item.audioFile && <p className="text-gray-700 truncate">🎵 Audio: {item.audioFile}</p>}
                  {item.videoFile && <p className="text-gray-700 truncate">🎬 Video: {item.videoFile}</p>}
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">
                    Updated: {new Date(item.updatedAt).toLocaleString()}
                  </p>
                  {item.status === 'failed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={retryingId === item.id}
                      onClick={() => handleRetry(item)}
                    >
                      {retryingId === item.id ? "Re-queuing..." : "Retry"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
