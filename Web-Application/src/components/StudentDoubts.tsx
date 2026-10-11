import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  MessageSquare,
  PlusCircle,
  X,
  Search,
  CheckCircle2,
  Clock,
  ThumbsUp,
  User,
  Filter,
  Send,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getStudentDoubts, getCourses, createDoubt } from '../lib/api';

interface Doubt {
  id: string;
  courseId: string;
  studentName: string;
  question: string;
  date: string;
  reply?: string | null;
  upvotes?: number;
}

interface Course {
  id: string;
  code: string;
  name: string;
  professor: string;
}

interface StudentDoubtsProps {
  onClose: () => void;
}

export function StudentDoubts({ onClose }: StudentDoubtsProps) {
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'answered' | 'pending'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());

  const [newDoubt, setNewDoubt] = useState({
    courseId: '',
    studentName: 'Student (Me)',
    question: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [doubtsData, coursesData] = await Promise.all([
          getStudentDoubts(),
          getCourses()
        ]);
        // Add default upvote count if missing
        const mappedDoubts = doubtsData.map((d: any) => ({
          ...d,
          upvotes: d.upvotes ?? Math.floor(Math.random() * 8) + 1,
        }));
        setDoubts(mappedDoubts);
        setCourses(coursesData);
        if (coursesData.length > 0) {
          setNewDoubt((prev) => ({ ...prev, courseId: coursesData[0].id }));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleUpvote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUpvotedIds((prev) => {
      const next = new Set(prev);
      const isAlreadyUpvoted = next.has(id);
      if (isAlreadyUpvoted) {
        next.delete(id);
      } else {
        next.add(id);
      }
      setDoubts((prevDoubts) =>
        prevDoubts.map((d) =>
          d.id === id
            ? { ...d, upvotes: (d.upvotes ?? 0) + (isAlreadyUpvoted ? -1 : 1) }
            : d
        )
      );
      return next;
    });
  };

  const handleSubmitDoubt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoubt.courseId || !newDoubt.studentName || !newDoubt.question.trim()) {
      alert('Please fill all fields');
      return;
    }

    try {
      const createdObj = {
        id: `doubt_${Date.now()}`,
        courseId: newDoubt.courseId,
        studentName: newDoubt.studentName,
        question: newDoubt.question.trim(),
        date: newDoubt.date,
        reply: null,
        upvotes: 1,
      };

      await createDoubt({
        courseId: newDoubt.courseId,
        studentName: newDoubt.studentName,
        question: newDoubt.question.trim(),
        date: newDoubt.date
      });

      // Update state locally with new doubt at the top
      setDoubts([createdObj, ...doubts]);

      setNewDoubt({
        courseId: courses[0]?.id || '',
        studentName: 'Student (Me)',
        question: '',
        date: new Date().toISOString().split('T')[0]
      });
      setIsAdding(false);
    } catch (error) {
      console.error('Error creating doubt:', error);
      alert('Failed to submit doubt');
    }
  };

  const filteredDoubts = doubts.filter((d) => {
    const matchesSearch =
      d.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.studentName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'answered'
        ? Boolean(d.reply)
        : !d.reply;

    const matchesCourse = courseFilter === 'all' || d.courseId === courseFilter;

    return matchesSearch && matchesStatus && matchesCourse;
  });

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 select-none">
      {/* ─── Top Header & Controls ─── */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                Doubt Resolution Hub
              </span>
              <span className="text-xs text-slate-500">Live Peer & Faculty Forum</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Course Doubts & Clarifications
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Ask conceptual questions directly to course professors and browse peer inquiries.
            </p>
          </div>

          <Button
            onClick={() => setIsAdding(true)}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-10 px-4 gap-1.5 shadow-sm shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Ask a New Doubt</span>
          </Button>
        </div>

        {/* Filter & Search Bar */}
        <div className="pt-4 flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search doubts by keyword or topic..."
              className="pl-9 h-10 rounded-xl bg-slate-50 border-slate-200 text-xs text-slate-800 focus:bg-white"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0">
            {[
              { id: 'all', label: 'All Doubts' },
              { id: 'answered', label: 'Answered' },
              { id: 'pending', label: 'Pending' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Course Filter Dropdown */}
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 font-medium focus:bg-white shrink-0"
          >
            <option value="all">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── Doubts List ─── */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Loading student questions...</p>
        </div>
      ) : filteredDoubts.length === 0 ? (
        <Card className="p-12 text-center bg-white border-slate-200 rounded-2xl shadow-xs">
          <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800 mb-1">No doubts found</h3>
          <p className="text-xs text-slate-500 mb-4">
            Try adjusting your search filters or ask the first doubt!
          </p>
          <Button
            size="sm"
            onClick={() => setIsAdding(true)}
            className="rounded-xl text-xs bg-blue-600 text-white"
          >
            Ask a Doubt
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDoubts.map((doubt) => {
            const course = courses.find((c) => c.id === doubt.courseId);
            const isUpvoted = upvotedIds.has(doubt.id);

            return (
              <motion.div
                key={doubt.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-semibold">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-slate-900">{doubt.studentName}</h3>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{course ? `${course.code}: ${course.name}` : 'Course Doubt'}</span>
                        <span>•</span>
                        <span>{doubt.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Upvote Button */}
                    <button
                      onClick={(e) => handleUpvote(doubt.id, e)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        isUpvoted
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                      title="I have this doubt too"
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${isUpvoted ? 'fill-blue-600' : ''}`} />
                      <span>{doubt.upvotes ?? 1}</span>
                    </button>

                    {/* Status Pill */}
                    {doubt.reply ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Answered
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Awaiting Reply
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Text */}
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal mb-3">
                  "{doubt.question}"
                </p>

                {/* Professor's Verified Response */}
                {doubt.reply && (
                  <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 mt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-bold text-emerald-900">
                        Instructor Verified Response:
                      </span>
                      {course && (
                        <span className="text-[10px] text-emerald-700">({course.professor})</span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-emerald-950 leading-relaxed">
                      {doubt.reply}
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ─── Ask a New Doubt Modal ─── */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-2xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-xl"
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-slate-900">Submit Question / Doubt</h3>
                </div>
                <button
                  onClick={() => setIsAdding(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitDoubt} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <Label htmlFor="doubtCourse" className="text-xs font-semibold text-slate-700 block mb-1">
                    Select Course
                  </Label>
                  <select
                    id="doubtCourse"
                    value={newDoubt.courseId}
                    onChange={(e) => setNewDoubt({ ...newDoubt, courseId: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800"
                    required
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name} ({c.professor})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="studentName" className="text-xs font-semibold text-slate-700 block mb-1">
                    Your Name / Handle
                  </Label>
                  <Input
                    id="studentName"
                    value={newDoubt.studentName}
                    onChange={(e) => setNewDoubt({ ...newDoubt, studentName: e.target.value })}
                    className="rounded-xl text-xs"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="doubtQuestion" className="text-xs font-semibold text-slate-700 block mb-1">
                    Your Conceptual Question
                  </Label>
                  <textarea
                    id="doubtQuestion"
                    value={newDoubt.question}
                    onChange={(e) => setNewDoubt({ ...newDoubt, question: e.target.value })}
                    placeholder="Describe what part of the lecture was confusing, formula derivation, or conceptual question..."
                    className="w-full h-28 p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAdding(false)}
                    className="rounded-xl text-xs h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 px-5"
                  >
                    Post Question
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
