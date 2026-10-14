import React, { useState, useEffect, useCallback } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { getLectures, getSlides } from "../../lib/api";
import { toBrowserUrl } from "../../lib/lecture-normalize";
import { Lecture, Slide } from "../../types";

/** Fired after slides are uploaded elsewhere on the page so this list refreshes. */
export const SLIDES_UPLOADED_EVENT = "slides-uploaded";

interface SlidesManagementProps {
  courseId: string;
}

export function SlidesManagement({ courseId }: SlidesManagementProps) {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [slides, setSlides] = useState<Record<string, Slide[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedLecture, setSelectedLecture] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const lecturesData = await getLectures(courseId);
      setLectures(lecturesData);

      // Fetch slides for each lecture
      const slidesData: Record<string, Slide[]> = {};
      await Promise.all(
        lecturesData.map(async (lecture) => {
          slidesData[lecture.id] = await getSlides(lecture.id);
        })
      );
      setSlides(slidesData);

      // Keep the current selection if it still exists, otherwise pick the first lecture
      setSelectedLecture((current) =>
        current && lecturesData.some((l) => l.id === current)
          ? current
          : lecturesData[0]?.id ?? null
      );
    } catch (error) {
      console.error("Error fetching slides data:", error);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    fetchData();
    const onUploaded = () => fetchData();
    window.addEventListener(SLIDES_UPLOADED_EVENT, onUploaded);
    return () => window.removeEventListener(SLIDES_UPLOADED_EVENT, onUploaded);
  }, [courseId, fetchData]);

  const handleLectureSelect = (lectureId: string) => {
    setSelectedLecture(lectureId);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lecture = lectures.find((l) => l.id === selectedLecture);
    if (!lecture || !selectedFile) {
      alert("Choose a PDF to upload.");
      return;
    }

    try {
      setIsUploading(true);
      const form = new FormData();
      form.append("file", selectedFile);
      form.append("courseId", courseId);
      form.append("lectureNumber", String(lecture.number));
      form.append("date", lecture.date || "");
      const res = await fetch("/api/upload/slides", { method: "POST", body: form });
      const body = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error((body as any).error || "Slide upload failed");

      await fetchData();
      setSelectedFile(null);
      setShowUploadForm(false);
    } catch (error: any) {
      console.error("Error uploading slide:", error);
      alert(error?.message || "Slide upload failed");
    } finally {
      setIsUploading(false);
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
      <h2 className="text-2xl font-semibold mb-6 text-center text-blue-700">
        Slides Management
      </h2>
      
      {lectures.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-500">No lectures available for this course.</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <Label htmlFor="lecture-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Lecture
            </Label>
            <div className="flex flex-wrap gap-2">
              {lectures.map(lecture => (
                <Button
                  key={lecture.id}
                  type="button"
                  variant={selectedLecture === lecture.id ? "default" : "outline"}
                  className={selectedLecture === lecture.id ? "bg-blue-600" : "bg-blue-50 hover:bg-blue-100"}
                  onClick={() => handleLectureSelect(lecture.id)}
                >
                  Lecture {lecture.number}
                </Button>
              ))}
            </div>
          </div>
          
          {selectedLecture && (
            <div className="space-y-6">
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-blue-700">
                    {lectures.find(l => l.id === selectedLecture)?.topic || 'Lecture Slides'}
                  </h3>
                  <Button
                    onClick={() => setShowUploadForm(!showUploadForm)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {showUploadForm ? "Cancel" : "Add More Slides"}
                  </Button>
                </div>
                
                {showUploadForm && (
                  <form onSubmit={handleUploadSubmit} className="mb-6 p-4 border rounded-lg bg-white">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-1">
                          Upload Slide (PDF)
                        </Label>
                        <Input
                          id="file-upload"
                          type="file"
                          accept=".pdf"
                          className="w-full"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                        />
                      </div>
                      
                      <Button
                        type="submit"
                        disabled={!selectedFile || isUploading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isUploading ? "Uploading..." : "Upload Slide"}
                      </Button>
                    </div>
                  </form>
                )}
                
                <div className="space-y-2">
                  {slides[selectedLecture]?.length > 0 ? (
                    slides[selectedLecture].map((slide, index) => (
                      <div 
                        key={slide.id}
                        className="flex justify-between items-center p-3 bg-white rounded border hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-blue-600 font-medium">#{index + 1}</span>
                          <span className="text-gray-700">{slide.fileName}</span>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            disabled={!/^(https?|gs):\/\//.test(slide.filePath)}
                            onClick={() => window.open(toBrowserUrl(slide.filePath), "_blank", "noopener,noreferrer")}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-4 text-gray-500">
                      No slides uploaded for this lecture yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}