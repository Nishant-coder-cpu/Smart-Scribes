import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderKanban,
  Sparkles,
  BookOpen,
  Lightbulb,
  CheckCircle,
  CheckCircle2,
  Circle,
  ExternalLink,
  Users,
  Code2,
  X,
  Plus,
  ArrowRight,
  Database,
  Layers,
  Send
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface ProjectItem {
  id: string;
  title: string;
  courses: string[];
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  progress: number;
  concepts: string[];
  aiSuggestions: string[];
  milestones: { id: string; text: string; done: boolean }[];
  resources: { name: string; type: string; url: string }[];
}

const PROJECTS_STORAGE_KEY = 'smart-scribes:project-planner';

export function ProjectSection() {
  const [projects, setProjects] = useState<ProjectItem[]>([
    {
      id: '1',
      title: 'Real-time Speech Recognition & Synthesizer',
      courses: ['IC-252', 'IC-256'],
      description: 'Build a low-latency speech recognition pipeline using Z-transform filters, MFCC spectrogram extraction, and recurrent neural models.',
      difficulty: 'Advanced',
      progress: 50,
      concepts: ['Fourier Transform', 'Neural Networks', 'Audio Processing', 'Digital Filters'],
      aiSuggestions: [
        'Preprocess live audio input using Butterworth bandpass filter to eliminate line noise',
        'Extract 40-dimensional Mel-Frequency Cepstral Coefficients (MFCC) per 25ms audio frame',
        'Pass features through a Bidirectional LSTM / Conformer encoder for acoustic decoding',
      ],
      milestones: [
        { id: 'm1_1', text: 'Implement audio capture & Z-transform filter in Python', done: true },
        { id: 'm1_2', text: 'Compute Fast Fourier Transform (FFT) spectrograms', done: true },
        { id: 'm1_3', text: 'Train acoustic encoder with CTC loss on LibriSpeech dataset', done: false },
        { id: 'm1_4', text: 'Build interactive web interface for realtime microphone input', done: false },
      ],
      resources: [
        { name: 'LibriSpeech 100h Clean Dataset', type: 'Dataset', url: 'https://www.openslr.org/12' },
        { name: 'PyTorch Audio DSP Toolkit', type: 'Documentation', url: 'https://pytorch.org/audio' },
        { name: 'IC-252 Lecture 4: Digital Filtering', type: 'Course Note', url: '#' },
      ],
    },
    {
      id: '2',
      title: 'Adaptive Distributed Network Topology Analyzer',
      courses: ['DC-256', 'IC-112'],
      description: 'Analyze and visualize dynamic internet packet routing and packet drops using Dijkstra graph algorithms and flow maximization.',
      difficulty: 'Intermediate',
      progress: 66,
      concepts: ['Graph Algorithms', 'Routing Protocols', 'Data Structures', 'Flow Networks'],
      aiSuggestions: [
        'Model the autonomous system routers as a directed weighted graph in adjacency list format',
        'Implement Dijkstra shortest-path with Min-Heap for sub-millisecond route recalculation',
        'Simulate link failure cascades and measure time-to-convergence under BGP protocol rules',
      ],
      milestones: [
        { id: 'm2_1', text: 'Design graph data structure with fast neighbor lookups', done: true },
        { id: 'm2_2', text: 'Implement shortest path routing & congestion simulator', done: true },
        { id: 'm2_3', text: 'Build interactive force-directed graph UI with node drag & drop', done: false },
      ],
      resources: [
        { name: 'CAIDA Autonomous System Relationship Dataset', type: 'Dataset', url: 'https://www.caida.org' },
        { name: 'RFC 2328 OSPF Version 2 Standard Specification', type: 'Reference', url: 'https://datatracker.ietf.org' },
      ],
    },
    {
      id: '3',
      title: 'AI-Powered Adaptive Lecture Study Planner',
      courses: ['IC-256', 'DC-202'],
      description: 'Create an intelligent academic study scheduler that models student forgetting curves and synthesizes customized revision pathways.',
      difficulty: 'Beginner',
      progress: 25,
      concepts: ['Machine Learning', 'Spaced Repetition', 'Database Design', 'Recommendation'],
      aiSuggestions: [
        'Apply the Ebbinghaus forgetting curve formula to model retention decay per lecture topic',
        'Implement collaborative filtering to suggest supplementary reference material',
        'Normalize database tables for users, course lectures, quiz scores, and scheduled reviews',
      ],
      milestones: [
        { id: 'm3_1', text: 'Define PostgreSQL schema with B+ tree indexes on student IDs', done: true },
        { id: 'm3_2', text: 'Write spaced repetition scheduling algorithm in TypeScript', done: false },
        { id: 'm3_3', text: 'Connect with Smart Scribes QnA quiz results API', done: false },
        { id: 'm3_4', text: 'Deploy web notification system for pending review sessions', done: false },
      ],
      resources: [
        { name: 'SM-2 Spaced Repetition Algorithm Reference', type: 'Algorithm', url: 'https://super-memory.com' },
        { name: 'DC-202 Database Normalization Handout', type: 'Course Note', url: '#' },
      ],
    },
  ]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedProjects = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (savedProjects) {
        const parsedProjects: unknown = JSON.parse(savedProjects);
        if (Array.isArray(parsedProjects)) setProjects(parsedProjects as ProjectItem[]);
      }
    } catch (error) {
      console.warn('Could not restore project planner data:', error);
    } finally {
      setProjectsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!projectsLoaded) return;
    try {
      window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    } catch (error) {
      console.warn('Could not save project planner data:', error);
    }
  }, [projects, projectsLoaded]);

  // Modal States
  const [activeAiModal, setActiveAiModal] = useState<ProjectItem | null>(null);
  const [activeResourcesModal, setActiveResourcesModal] = useState<ProjectItem | null>(null);
  const [activeTeamModal, setActiveTeamModal] = useState<ProjectItem | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [teamRequestSent, setTeamRequestSent] = useState<string | null>(null);

  // New Project Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCourses, setNewCourses] = useState('');
  const [newDifficulty, setNewDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');

  // Toggle milestone completion & re-calculate progress
  const toggleMilestone = (projectId: string, milestoneId: string) => {
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== projectId) return proj;
        const updatedMilestones = proj.milestones.map((m) =>
          m.id === milestoneId ? { ...m, done: !m.done } : m
        );
        const doneCount = updatedMilestones.filter((m) => m.done).length;
        const newProgress = Math.round((doneCount / updatedMilestones.length) * 100);
        return {
          ...proj,
          milestones: updatedMilestones,
          progress: newProgress,
        };
      })
    );
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    const courseList = newCourses
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const createdProject: ProjectItem = {
      id: `proj_${Date.now()}`,
      title: newTitle.trim(),
      courses: courseList.length > 0 ? courseList : ['IC-252', 'IC-256'],
      description: newDesc.trim(),
      difficulty: newDifficulty,
      progress: 0,
      concepts: ['Machine Learning', 'Algorithms', 'System Design'],
      aiSuggestions: [
        'Establish modular project repository structure with unit testing',
        'Implement core algorithm benchmark on synthetic baseline data',
        'Document architecture diagram and connect with course notes',
      ],
      milestones: [
        { id: `m_${Date.now()}_1`, text: 'Set up development environment and repository', done: false },
        { id: `m_${Date.now()}_2`, text: 'Implement core model or algorithm architecture', done: false },
        { id: `m_${Date.now()}_3`, text: 'Evaluate performance metrics against course benchmarks', done: false },
      ],
      resources: [
        { name: 'Starter Code Template', type: 'Repository', url: '#' },
        { name: 'Course Concept Reference Guide', type: 'Course Note', url: '#' },
      ],
    };

    setProjects((currentProjects) => [createdProject, ...currentProjects]);
    setIsGenerateModalOpen(false);
    setNewTitle('');
    setNewDesc('');
    setNewCourses('');
  };

  const collaborators = [
    { name: 'Arjun Rao', year: '3rd Year B.Tech', skills: ['PyTorch', 'Audio DSP', 'FastAPI'], available: true },
    { name: 'Sneha Patel', year: '2nd Year B.Tech', skills: ['React', 'Manim Animations', 'TypeScript'], available: true },
    { name: 'Kavita Iyer', year: '4th Year B.Tech', skills: ['Graph Theory', 'C++', 'Distributed Systems'], available: false },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/60 p-4 sm:p-6 lg:p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ─── Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5 text-blue-600" />
                  Academic Project Studio
                </span>
                <span className="text-xs text-slate-500">Autonomous Concept Application</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Course Project Planner
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-normal leading-relaxed">
                Turn theoretical lecture concepts into portfolio projects. Track milestones, browse verified resources, get AI architecture advice, and collaborate with classmates.
              </p>
            </div>

            <Button
              onClick={() => setIsGenerateModalOpen(true)}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-10 px-4 gap-1.5 shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Project</span>
            </Button>
          </div>
        </motion.div>

        {/* ─── Project Cards List ─── */}
        <div className="space-y-6">
          {projects.map((project, idx) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
            >
              <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs hover:shadow-sm transition-all">
                {/* Project Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                        {project.title}
                      </h2>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          project.difficulty === 'Beginner'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : project.difficulty === 'Intermediate'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {project.difficulty}
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                      {project.description}
                    </p>
                  </div>

                  {/* Course Tags */}
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    {project.courses.map((course) => (
                      <span
                        key={course}
                        className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1"
                      >
                        <BookOpen className="w-3 h-3 text-blue-600" />
                        {course}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Live Milestone Progress Bar */}
                <div className="mb-5 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      Milestone Progression
                    </span>
                    <span className="font-bold text-blue-600">{project.progress}% Complete</span>
                  </div>
                  <Progress value={project.progress} className="h-2 bg-slate-200" />
                </div>

                {/* Interactive Milestones Checklist */}
                <div className="mb-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Actionable Milestones (Click to toggle status)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {project.milestones.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => toggleMilestone(project.id, m.id)}
                        className={`p-2.5 rounded-xl border text-xs flex items-center gap-2.5 cursor-pointer transition-all ${
                          m.done
                            ? 'bg-emerald-50/50 border-emerald-200 text-slate-900 font-medium'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                        }`}
                      >
                        <button type="button" className="shrink-0">
                          {m.done ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                        <span className={m.done ? 'line-through text-slate-400' : ''}>
                          {m.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Concepts Tagged */}
                <div className="mb-5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                    Concepts:
                  </span>
                  {project.concepts.map((concept) => (
                    <span
                      key={concept}
                      className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {concept}
                    </span>
                  ))}
                </div>

                {/* Interactive Action Buttons */}
                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
                  <Button
                    size="sm"
                    onClick={() => setActiveAiModal(project)}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 px-3.5 gap-1.5 shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Get AI Architecture Plan</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveResourcesModal(project)}
                    className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium h-9 px-3 gap-1.5"
                  >
                    <Database className="w-3.5 h-3.5 text-slate-500" />
                    <span>View Resources ({project.resources.length})</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTeamModal(project)}
                    className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium h-9 px-3 gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>Find Teammates</span>
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ─── AI Assistance Modal ─── */}
        <AnimatePresence>
          {activeAiModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-2xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-slate-200 shadow-xl max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-slate-900">
                      AI Architecture Breakdown
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveAiModal(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 text-xs sm:text-sm">
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-1">Target Project:</h4>
                    <p className="text-slate-600">{activeAiModal.title}</p>
                  </div>

                  <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100">
                    <h4 className="font-semibold text-blue-900 mb-2">Recommended System Pipeline:</h4>
                    <div className="space-y-2">
                      {activeAiModal.aiSuggestions.map((sug, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <p className="text-blue-950 leading-relaxed">{sug}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2">Suggested Tech Stack:</h4>
                    <div className="flex flex-wrap gap-2">
                      {['Python 3.11', 'PyTorch / TensorFlow', 'NumPy / SciPy', 'FastAPI', 'Next.js Frontend'].map((tech) => (
                        <span key={tech} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium text-xs border border-slate-200">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                  <Button
                    onClick={() => setActiveAiModal(null)}
                    className="rounded-xl bg-blue-600 text-white text-xs font-semibold h-9 px-5"
                  >
                    Close Architecture Guide
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ─── Resources Browser Modal ─── */}
        <AnimatePresence>
          {activeResourcesModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-2xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-slate-200 shadow-xl"
              >
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-slate-900">Project Resources & References</h3>
                  </div>
                  <button
                    onClick={() => setActiveResourcesModal(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {activeResourcesModal.resources.map((res, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between hover:bg-slate-100/60 transition-colors"
                    >
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-800">{res.name}</h4>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{res.type}</span>
                      </div>
                      {/^https?:\/\//i.test(res.url) ? (
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 text-xs font-semibold flex items-center gap-1"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="p-2 text-xs text-slate-400" aria-disabled="true">
                          Unavailable
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setActiveResourcesModal(null)}
                    className="rounded-xl text-xs h-9"
                  >
                    Close
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ─── Find Teammates Modal ─── */}
        <AnimatePresence>
          {activeTeamModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-2xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-slate-200 shadow-xl"
              >
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-slate-900">Classmate Collaborators</h3>
                  </div>
                  <button
                    onClick={() => setActiveTeamModal(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-slate-500 mb-4">
                  Students enrolled in {activeTeamModal.courses.join(', ')} seeking project partners:
                </p>

                <div className="space-y-3">
                  {collaborators.map((collab, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-semibold text-slate-900">{collab.name}</h4>
                          <span className="text-[10px] text-slate-500">• {collab.year}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {collab.skills.map((s) => (
                            <span key={s} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => {
                          setTeamRequestSent(collab.name);
                          setTimeout(() => setTeamRequestSent(null), 2500);
                        }}
                        className={`text-xs rounded-xl h-8 px-3 ${
                          teamRequestSent === collab.name
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                        }`}
                      >
                        {teamRequestSent === collab.name ? 'Invitation Sent!' : 'Invite to Team'}
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTeamModal(null)}
                    className="rounded-xl text-xs h-9"
                  >
                    Done
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ─── Create / Generate New Project Modal ─── */}
        <AnimatePresence>
          {isGenerateModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-2xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-xl"
              >
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-slate-900">Create Academic Project</h3>
                  </div>
                  <button
                    onClick={() => setIsGenerateModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateProject} className="space-y-4 text-xs sm:text-sm">
                  <div>
                    <Label htmlFor="projTitle" className="text-xs font-semibold text-slate-700 block mb-1">
                      Project Title
                    </Label>
                    <Input
                      id="projTitle"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Autonomous Drone Obstacle Avoidance"
                      className="rounded-xl text-xs"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="projCourses" className="text-xs font-semibold text-slate-700 block mb-1">
                      Associated Courses (comma separated)
                    </Label>
                    <Input
                      id="projCourses"
                      value={newCourses}
                      onChange={(e) => setNewCourses(e.target.value)}
                      placeholder="e.g. IC-252, IC-256"
                      className="rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <Label htmlFor="projDifficulty" className="text-xs font-semibold text-slate-700 block mb-1">
                      Complexity Level
                    </Label>
                    <select
                      id="projDifficulty"
                      value={newDifficulty}
                      onChange={(e) => setNewDifficulty(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="projDesc" className="text-xs font-semibold text-slate-700 block mb-1">
                      Problem Statement & Scope
                    </Label>
                    <textarea
                      id="projDesc"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="Brief description of the challenge and planned technical architecture..."
                      className="w-full h-24 p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                      required
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsGenerateModalOpen(false)}
                      className="rounded-xl text-xs h-9"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 px-5"
                    >
                      Create Project Plan
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
