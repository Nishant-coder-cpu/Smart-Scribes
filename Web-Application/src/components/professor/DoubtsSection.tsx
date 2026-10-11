import React, { useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { MessageSquare, Send, CheckCircle2, Clock, Search, X } from "lucide-react";
import { Course, ProfessorDoubt } from "../../types/index";

interface DoubtsSectionProps {
  doubts: ProfessorDoubt[];
  courses: Course[];
  handleReply: (id: string, customReply?: string) => void;
}

export function DoubtsSection({ doubts, courses, handleReply }: DoubtsSectionProps) {
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState<string>("");
  const [filterCourseId, setFilterCourseId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "answered">("all");

  const handleSubmitReply = (id: string) => {
    if (!replyInput.trim()) return;
    handleReply(id, replyInput.trim());
    setActiveReplyId(null);
    setReplyInput("");
  };

  const filteredDoubts = doubts.filter((d) => {
    const matchesCourse = filterCourseId === "all" || d.courseId === filterCourseId;
    const matchesStatus =
      filterStatus === "all"
        ? true
        : filterStatus === "answered"
        ? Boolean(d.reply)
        : !d.reply;
    return matchesCourse && matchesStatus;
  });

  return (
    <Card className="p-6 sm:p-8 border border-slate-200 bg-white rounded-2xl shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <MessageSquare className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Student Doubt Inquiries
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Review conceptual questions asked by students across your enrolled courses
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 font-medium"
          >
            <option value="all">All Inquiries</option>
            <option value="pending">Pending Reply</option>
            <option value="answered">Answered</option>
          </select>

          <select
            value={filterCourseId}
            onChange={(e) => setFilterCourseId(e.target.value)}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 font-medium"
          >
            <option value="all">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.courseCode || c.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredDoubts.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-xs">No questions matching your current filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDoubts.map((doubt) => {
            const course = courses.find((c) => c.id === doubt.courseId);
            const isReplying = activeReplyId === doubt.id;

            return (
              <div
                key={doubt.id}
                className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">Student Question</span>
                    <span className="text-slate-400">•</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                      {course ? `${course.courseCode || course.code}: ${course.courseName || course.name}` : "General"}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">{doubt.date}</span>
                </div>

                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal">
                  "{doubt.question}"
                </p>

                {/* Existing Reply Display */}
                {doubt.reply ? (
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950">
                    <p className="font-bold text-emerald-900 mb-0.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Faculty Reply Sent:
                    </p>
                    <p className="leading-relaxed">{doubt.reply}</p>
                  </div>
                ) : isReplying ? (
                  /* Inline Reply Form */
                  <div className="p-3 bg-white border border-blue-200 rounded-xl space-y-2.5">
                    <textarea
                      value={replyInput}
                      onChange={(e) => setReplyInput(e.target.value)}
                      placeholder="Type your explanation or answer for the student..."
                      className="w-full h-20 p-2.5 text-xs text-slate-800 bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setActiveReplyId(null);
                          setReplyInput("");
                        }}
                        className="text-xs h-8"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSubmitReply(doubt.id)}
                        className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3 gap-1.5"
                      >
                        <Send className="w-3 h-3" />
                        Send Answer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      setActiveReplyId(doubt.id);
                      setReplyInput("");
                    }}
                    className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3"
                  >
                    Reply to Student
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}