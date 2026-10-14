import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  BookOpen,
  Clock,
  User,
  MessageCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  Bookmark,
  Share2,
  CheckCircle2,
  Sparkles,
  Edit3,
  Save,
  RotateCcw,
  Network,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { LectureContent as LectureContentType } from '../types';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';

interface LectureContentProps {
  content: LectureContentType;
}

// Notes and bookmarks are per-browser conveniences kept in localStorage.
// Access can throw (private mode, blocked storage), so failures are ignored.
function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function LectureContent({ content }: LectureContentProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['definition', 'content'])
  );
  const [activeConceptId, setActiveConceptId] = useState<string | null>(null);
  const [personalNotes, setPersonalNotes] = useState<string>('');
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'concepts' | 'animations' | 'examples'>('all');

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const scrollToSection = (id: string) => {
    setActiveConceptId(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Temporary highlight pulse
      element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
      }, 1800);
    }
  };

  const notesKey = `smart-scribes:notes:${content.lectureId}`;
  const bookmarkKey = `smart-scribes:bookmark:${content.lectureId}`;

  // Load this lecture's saved notes/bookmark whenever the lecture changes.
  useEffect(() => {
    setPersonalNotes(readStored(notesKey) ?? '');
    setBookmarked(readStored(bookmarkKey) === '1');
  }, [notesKey, bookmarkKey]);

  const toggleBookmark = () => {
    const next = !bookmarked;
    setBookmarked(next);
    writeStored(bookmarkKey, next ? '1' : null);
  };

  const handleSaveNotes = () => {
    writeStored(notesKey, personalNotes.trim() ? personalNotes : null);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  // Jump video to timestamp (e.g. "12:45" -> 765 seconds)
  const jumpToTimestamp = (timestampStr?: string) => {
    if (!timestampStr || !videoRef.current) return;
    const parts = timestampStr.split(':').map(Number);
    let seconds = 0;
    if (parts.length === 2) {
      seconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    videoRef.current.currentTime = seconds;
    videoRef.current.play();
  };

  // Build concept flow nodes from the content
  const conceptNodes = [
    { id: 'section-definition', label: 'Definition', type: 'core' },
    ...content.content.map((sec, idx) => ({
      id: `concept-${sec.id || idx}`,
      label: sec.title.length > 22 ? sec.title.substring(0, 20) + '...' : sec.title,
      type: sec.type,
    })),
    ...(content.animations && content.animations.length > 0
      ? [{ id: 'section-animations', label: 'Visual Animations', type: 'visual' }]
      : []),
    ...(content.examples && content.examples.length > 0
      ? [{ id: 'section-examples', label: 'Solved Examples', type: 'examples' }]
      : []),
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/60 pb-16">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* ─── Lecture Header & Quick Actions Bar ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                  Interactive Lecture Note
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Auto-synthesized from live session
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {content.topic}
              </h1>
            </div>

            {/* Quick Interactive Actions */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleBookmark}
                className={`gap-1.5 rounded-xl text-xs font-medium border-slate-200 transition-colors ${
                  bookmarked ? 'bg-amber-50 text-amber-700 border-amber-300' : 'text-slate-600 hover:bg-slate-50'
                }`}
                title={bookmarked ? 'Remove Bookmark' : 'Bookmark Lecture'}
              >
                <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-amber-500 text-amber-500' : ''}`} />
                <span>{bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsNotesOpen(!isNotesOpen)}
                className={`gap-1.5 rounded-xl text-xs font-medium border-slate-200 ${
                  isNotesOpen ? 'bg-blue-50 text-blue-700 border-blue-300' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                <span>Quick Notes</span>
              </Button>
            </div>
          </div>

          {/* ─── Interactive Concept Flow / Synapse Roadmap ─── */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-blue-600" />
                Concept Progression Map
              </span>
              <span className="text-[11px] text-slate-400">
                Click any node to navigate directly
              </span>
            </div>

            {/* Interactive Flow Nodes Track */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {conceptNodes.map((node, idx) => {
                const isActive = activeConceptId === node.id;
                return (
                  <div key={node.id} className="flex items-center shrink-0">
                    <button
                      onClick={() => scrollToSection(node.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-blue-600'}`} />
                      <span>{node.label}</span>
                    </button>

                    {idx < conceptNodes.length - 1 && (
                      <div className="w-4 h-[1.5px] bg-slate-200 mx-1 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* ─── Student Personal Notes Drawer (Expandable) ─── */}
        <AnimatePresence>
          {isNotesOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card className="p-4 sm:p-5 bg-blue-50/40 border-blue-200/80 rounded-2xl shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-slate-800">My Study Notes for this Lecture</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {notesSaved && (
                      <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Saved
                      </span>
                    )}
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      className="h-8 gap-1 rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save
                    </Button>
                  </div>
                </div>
                <textarea
                  value={personalNotes}
                  onChange={(e) => setPersonalNotes(e.target.value)}
                  placeholder="Jot down formulas, questions, or ideas while studying this lecture..."
                  className="w-full h-24 p-3 bg-white rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                />
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Definition & Interactive Self-Test Flashcard ─── */}
        <motion.div
          id="section-definition"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="transition-all rounded-2xl"
        >
          <Card className="p-6 bg-gradient-to-br from-blue-50/50 via-white to-slate-50/50 border-blue-200/70 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Core Concept Definition
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                className="h-7 text-xs font-medium rounded-lg text-blue-700 border-blue-200 bg-white hover:bg-blue-50 gap-1.5"
              >
                <RotateCcw className="w-3 h-3 text-blue-600" />
                {flashcardFlipped ? 'Show Full Text' : 'Self-Test Flashcard'}
              </Button>
            </div>

            {flashcardFlipped ? (
              <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-xs text-center space-y-2">
                <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
                  Flashcard Recall Prompt
                </span>
                <p className="text-base font-medium text-slate-800">
                  What is the foundational definition of <em>{content.topic}</em>?
                </p>
                <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                  Try to recall the definition mentally, then click "Show Full Text" above to check your understanding!
                </p>
              </div>
            ) : (
              <p className="text-slate-700 leading-relaxed text-sm sm:text-base font-normal">
                {content.definition}
              </p>
            )}
          </Card>
        </motion.div>

        {/* ─── Recording & Textbook Reference ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-5"
        >
          {/* Lecture Video Recording Player */}
          <Card className="p-5 bg-white border-slate-200 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                <Play className="w-4 h-4 text-purple-600" />
                Lecture Recording
              </h3>
              <span className="text-[11px] text-slate-500">Live Synchronized</span>
            </div>

            <div
              className="bg-slate-950 rounded-xl overflow-hidden relative w-full aspect-video shadow-inner"
            >
              {content?.recordingUrl ? (
                <video
                  ref={videoRef}
                  src={content.recordingUrl}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4 text-center">
                  <PlayCircle className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-xs">No media recording available for this session.</p>
                </div>
              )}
            </div>
          </Card>

          {/* Textbook Reference & Study Material */}
          <Card className="p-5 bg-white border-slate-200 rounded-2xl shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  Book Reference
                </h3>
                <span className="text-[11px] text-slate-500">Standard Text</span>
              </div>
              <div className="text-sm text-slate-700 leading-relaxed bg-emerald-50/60 border border-emerald-100 p-4 rounded-xl">
                {content.bookReference}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Chapter assigned by instructor</span>
              <span className="font-medium text-emerald-700 flex items-center gap-1">
                Verified Material <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
            </div>
          </Card>
        </motion.div>

        {/* ─── Main Lecture Content Sections ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="p-6 bg-white border-slate-200 rounded-2xl shadow-xs">
            <div
              className="flex items-center justify-between cursor-pointer mb-5 pb-3 border-b border-slate-100"
              onClick={() => toggleSection('content')}
            >
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Structured Lecture Notes</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Deep concept breakdowns, mathematical proofs, and dynamic code visuals
                </p>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-slate-500">
                {expandedSections.has('content') ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </Button>
            </div>

            <AnimatePresence>
              {expandedSections.has('content') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  {content.content.map((section, idx) => (
                    <motion.div
                      key={section.id || idx}
                      id={`concept-${section.id || idx}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      className={`p-5 rounded-2xl border transition-all ${
                        section.type === 'concept'
                          ? 'bg-purple-50/40 border-purple-200/80'
                          : section.type === 'proof'
                          ? 'bg-amber-50/40 border-amber-200/80'
                          : section.type === 'algorithm'
                          ? 'bg-emerald-50/40 border-emerald-200/80'
                          : 'bg-slate-50/60 border-slate-200/80'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            section.type === 'concept'
                              ? 'bg-purple-600'
                              : section.type === 'proof'
                              ? 'bg-amber-600'
                              : 'bg-emerald-600'
                          }`} />
                          <h3 className="text-base font-semibold text-slate-900">
                            {section.title}
                          </h3>
                        </div>

                        {section.timestamp && (
                          <button
                            onClick={() => jumpToTimestamp(section.timestamp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs transition-colors"
                            title="Click to jump video to this moment"
                          >
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span>{section.timestamp}</span>
                            <Play className="w-2.5 h-2.5 ml-0.5 text-blue-600" />
                          </button>
                        )}
                      </div>

                      {/* Instructor Spoken Note Callout */}
                      {section.professorNote && (
                        <div className="mb-3.5 p-3.5 bg-white/90 rounded-xl border border-indigo-100 shadow-2xs">
                          <p className="text-xs sm:text-sm text-indigo-900 font-normal leading-relaxed">
                            <User className="w-4 h-4 inline text-indigo-600 mr-2 shrink-0" />
                            <span className="font-semibold text-indigo-700">Professor Emphasis: </span>
                            <span className="italic">"{section.professorNote}"</span>
                          </p>
                        </div>
                      )}

                      {/* Content Body & Side Animation Video */}
                      <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6">
                        <div className="flex-1 text-slate-700 text-sm sm:text-base whitespace-pre-line leading-relaxed font-normal">
                          {section.content}
                        </div>

                        {section.animation && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="mt-4 lg:mt-0 lg:w-5/12 shrink-0"
                          >
                            <Card className="overflow-hidden border border-slate-200/90 rounded-xl shadow-xs bg-white">
                              <div className="relative aspect-video bg-slate-900">
                                <video
                                  src={section.animation.thumbnail}
                                  controls
                                  autoPlay
                                  loop
                                  muted
                                  playsInline
                                  className="w-full h-full object-cover"
                                />
                                <Badge className="absolute top-2 right-2 text-[10px] bg-slate-900/80 text-white backdrop-blur-xs">
                                  {section.animation.type}
                                </Badge>
                              </div>
                              <div className="p-3 bg-white">
                                <h4 className="text-xs font-bold text-slate-900 mb-0.5">
                                  {section.animation.title}
                                </h4>
                                <p className="text-[11px] text-slate-500 leading-snug">
                                  {section.animation.description}
                                </p>
                              </div>
                            </Card>
                          </motion.div>
                        )}
                      </div>

                      {/* Supplementary Diagram Image */}
                      {section.image && (
                        <div className="mt-4 pt-3 border-t border-slate-200/60">
                          <img
                            src={section.image}
                            alt={section.imageCaption || section.title}
                            className="max-w-md mx-auto rounded-xl shadow-sm border border-slate-200"
                          />
                          {section.imageCaption && (
                            <p className="text-xs text-slate-500 mt-2 text-center italic">
                              {section.imageCaption}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Book Reference Citation */}
                      {section.bookReference && (
                        <div className="mt-3.5 p-2.5 bg-white/70 rounded-lg border border-emerald-100 flex items-center gap-2 text-xs text-emerald-800">
                          <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span><strong>Read:</strong> {section.bookReference}</span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>

        {/* ─── Animated Explanations Showcase ─── */}
        {content.animations && content.animations.length > 0 && (
          <motion.div
            id="section-animations"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <Card className="p-6 bg-white border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-purple-600" />
                  Mathematical & Code Visualizations
                </h2>
                <Badge variant="outline" className="text-xs">
                  {content.animations.length} Manim Clips
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {content.animations.map((animation, idx) => (
                  <motion.div
                    key={animation.id || idx}
                    whileHover={{ y: -3 }}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs hover:shadow-sm transition-all"
                  >
                    <div className="relative aspect-video bg-slate-900">
                      <video
                        src={animation.thumbnail}
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <Badge className="absolute top-2 right-2 text-[10px] bg-slate-900/80 text-white backdrop-blur-xs">
                        {animation.type}
                      </Badge>
                    </div>
                    <div className="p-3.5">
                      <h3 className="font-semibold text-xs sm:text-sm text-slate-900 mb-1">
                        {animation.title}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {animation.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ─── Solved Examples Section ─── */}
        {content.examples && content.examples.length > 0 && (
          <motion.div
            id="section-examples"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card className="p-6 bg-white border-slate-200 rounded-2xl shadow-xs">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-600" />
                Solved Practice Examples
              </h2>
              <Accordion type="single" collapsible className="space-y-3">
                {content.examples.map((example) => (
                  <AccordionItem
                    key={example.id}
                    value={example.id}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-100/60 text-sm font-semibold text-slate-800">
                      <span>{example.title}</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-1 bg-white">
                      <div className="space-y-3">
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs sm:text-sm text-slate-800">
                          <h4 className="font-semibold text-slate-900 mb-1">Problem Statement:</h4>
                          <p className="whitespace-pre-line leading-relaxed">{example.problem}</p>
                        </div>
                        <div className="p-3.5 bg-emerald-50/60 rounded-xl border-l-4 border-emerald-500 text-xs sm:text-sm text-emerald-950">
                          <h4 className="font-semibold text-emerald-900 mb-1">Step-by-Step Solution:</h4>
                          <p className="whitespace-pre-line leading-relaxed">{example.solution}</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          </motion.div>
        )}

        {/* ─── Student Doubts & Clarifications ─── */}
        {content.doubts && content.doubts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
          >
            <Card className="p-6 bg-white border-slate-200 rounded-2xl shadow-xs">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                Questions Asked During This Lecture
              </h2>
              <div className="space-y-3.5">
                {content.doubts.map((doubt) => (
                  <div
                    key={doubt.id}
                    className="border border-slate-200 bg-slate-50/50 rounded-xl p-4 space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        {doubt.student}
                      </span>
                      {doubt.timestamp && (
                        <Badge variant="outline" className="text-[10px]">
                          {doubt.timestamp}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 font-medium italic">
                      "{doubt.question}"
                    </p>
                    {doubt.answer && (
                      <div className="p-3 bg-white rounded-lg border border-slate-200/80 text-xs sm:text-sm text-slate-700">
                        <p className="font-semibold text-blue-600 mb-0.5 text-xs">Instructor Answer:</p>
                        <p>{doubt.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

      </div>
    </div>
  );
}