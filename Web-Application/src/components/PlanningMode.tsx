import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb,
  Search,
  BookOpen,
  User,
  Star,
  Network,
  ArrowRight,
  CheckCircle2,
  Circle,
  Sparkles,
  Layers,
  GraduationCap,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface PlanningModeProps {
  onPracticeConcept: (topic: string) => void;
}

const MILESTONES_STORAGE_KEY = 'smart-scribes:planning-milestones';

interface ConceptNode {
  id: string;
  name: string;
  courses: string[];
  category: 'signals' | 'ml' | 'systems' | 'algorithms';
  x: number;
  y: number;
  description: string;
  professors: string[];
  prerequisites: string[];
  applications: string[];
  rating: number;
}

export function PlanningMode({ onPracticeConcept }: PlanningModeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConceptId, setSelectedConceptId] = useState<string>('c1');
  const [selectedTrack, setSelectedTrack] = useState<'ml-systems' | 'distributed' | 'algorithms'>('ml-systems');
  const [completedMilestones, setCompletedMilestones] = useState<Set<string>>(new Set(['m1']));
  const [milestonesLoaded, setMilestonesLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedMilestones = window.localStorage.getItem(MILESTONES_STORAGE_KEY);
      if (savedMilestones) {
        const parsedMilestones: unknown = JSON.parse(savedMilestones);
        if (Array.isArray(parsedMilestones)) {
          setCompletedMilestones(new Set(parsedMilestones.filter((id): id is string => typeof id === 'string')));
        }
      }
    } catch (error) {
      console.warn('Could not restore planning milestones:', error);
    } finally {
      setMilestonesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!milestonesLoaded) return;
    try {
      window.localStorage.setItem(MILESTONES_STORAGE_KEY, JSON.stringify(Array.from(completedMilestones)));
    } catch (error) {
      console.warn('Could not save planning milestones:', error);
    }
  }, [completedMilestones, milestonesLoaded]);

  const concepts: ConceptNode[] = [
    {
      id: 'c1',
      name: 'Fourier Transform & Spectral Analysis',
      courses: ['IC-252', 'IC-256'],
      category: 'signals',
      x: 180,
      y: 90,
      description: 'Decomposing signals into sinusoidal frequencies. Serves as the mathematical backbone for feature extraction in audio, vision, and ML signal pipelines.',
      professors: ['Dr. Rajesh Kumar', 'Dr. Amit Patel'],
      prerequisites: ['Calculus II', 'Linear Algebra'],
      applications: ['Speech recognition spectrograms', 'Noise reduction filters', 'Audio compression'],
      rating: 4.9,
    },
    {
      id: 'c2',
      name: 'Neural Network Optimization',
      courses: ['IC-256'],
      category: 'ml',
      x: 480,
      y: 80,
      description: 'Gradient descent, backpropagation dynamics, and loss landscape optimization for deep learning architectures.',
      professors: ['Dr. Amit Patel'],
      prerequisites: ['Fourier Transform', 'Multivariate Calculus'],
      applications: ['Transformer models', 'Computer Vision', 'Adaptive speech agents'],
      rating: 4.9,
    },
    {
      id: 'c3',
      name: 'Tree-based Algorithms in ML',
      courses: ['IC-112', 'IC-256'],
      category: 'algorithms',
      x: 320,
      y: 190,
      description: 'Foundational binary trees, AVL structures, leading into decision trees, gradient boosting, and random forests.',
      professors: ['Dr. Priya Sharma', 'Dr. Amit Patel'],
      prerequisites: ['Data Structures'],
      applications: ['Fraud detection', 'Tabular ML modeling', 'Fast search indexation'],
      rating: 4.8,
    },
    {
      id: 'c4',
      name: 'Graph Traversal & Network Routing',
      courses: ['IC-112', 'DC-256'],
      category: 'systems',
      x: 620,
      y: 190,
      description: 'Dijkstra, Bellman-Ford, and flow algorithms applied to distributed packet routing and network topology discovery.',
      professors: ['Dr. Priya Sharma', 'Dr. Sanjay Verma'],
      prerequisites: ['Data Structures', 'Discrete Mathematics'],
      applications: ['Internet routing BGP/OSPF', 'Social graph analysis', 'Mesh communication'],
      rating: 4.7,
    },
    {
      id: 'c5',
      name: 'Digital Filtering & Z-Transforms',
      courses: ['IC-252'],
      category: 'signals',
      x: 140,
      y: 260,
      description: 'Discrete-time signals, frequency response shaping, and IIR/FIR filter synthesis for realtime microcontrollers.',
      professors: ['Dr. Rajesh Kumar'],
      prerequisites: ['Fourier Transform'],
      applications: ['ECG biomedical monitoring', 'Audio equalizers', 'Sensor noise filtering'],
      rating: 4.8,
    },
    {
      id: 'c6',
      name: 'Database Indexing & Normalization',
      courses: ['DC-202', 'IC-112'],
      category: 'systems',
      x: 500,
      y: 290,
      description: 'B+ Tree indexing, relational normalization, and ACID properties for high-throughput transactional storage.',
      professors: ['Dr. Priya Sharma'],
      prerequisites: ['Tree-based Algorithms'],
      applications: ['Query optimization', 'Distributed databases', 'Enterprise records'],
      rating: 4.7,
    },
  ];

  // Interconnected concept edges (connections between concepts across courses)
  const edges = [
    { from: 'c1', to: 'c2', label: 'Feature Extraction' },
    { from: 'c1', to: 'c5', label: 'Transforms' },
    { from: 'c3', to: 'c2', label: 'ML Algorithms' },
    { from: 'c3', to: 'c4', label: 'Graph Theory' },
    { from: 'c3', to: 'c6', label: 'B+ Trees' },
    { from: 'c4', to: 'c6', label: 'Distributed State' },
  ];

  const tracks = [
    {
      id: 'ml-systems',
      name: 'Machine Learning & Signal Systems',
      description: 'Cross-discipline focus bridging signal math and neural models',
      milestones: [
        { id: 'm1', title: 'Master Fourier Transform foundations in IC-252', course: 'IC-252', status: 'done' },
        { id: 'm2', title: 'Implement MFCC Audio Feature Extraction pipeline', course: 'IC-252 + IC-256', status: 'in-progress' },
        { id: 'm3', title: 'Train Neural Network Optimizer on processed signals', course: 'IC-256', status: 'pending' },
        { id: 'm4', title: 'Deploy live inference agent with Manim animation visualizer', course: 'Capstone', status: 'pending' },
      ],
    },
    {
      id: 'distributed',
      name: 'Distributed Systems & Networks',
      description: 'Algorithms and systems engineering for internet scale',
      milestones: [
        { id: 'm10', title: 'Master Graph traversal & shortest path algorithms in IC-112', course: 'IC-112', status: 'done' },
        { id: 'm11', title: 'Implement OSPF/Dijkstra routing simulator in DC-256', course: 'DC-256', status: 'pending' },
        { id: 'm12', title: 'Design partitioned B+ Tree storage engine in DC-202', course: 'DC-202', status: 'pending' },
      ],
    },
    {
      id: 'algorithms',
      name: 'Core Algorithms & Data Structures',
      description: 'Computational theory and competitive algorithmic problem solving',
      milestones: [
        { id: 'm20', title: 'Complete Advanced Trees & Heaps in IC-112', course: 'IC-112', status: 'done' },
        { id: 'm21', title: 'Implement dynamic programming & memoized recursion', course: 'IC-112', status: 'in-progress' },
        { id: 'm22', title: 'Solve 20 practice cross-course algorithmic challenges', course: 'Self-Study', status: 'pending' },
      ],
    },
  ];

  const toggleMilestone = (id: string) => {
    setCompletedMilestones((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedConcept = concepts.find((c) => c.id === selectedConceptId) || concepts[0];

  const filteredConcepts = concepts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.courses.some((course) => course.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/60 p-4 sm:p-6 lg:p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ─── Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/60 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  Cross-Course Knowledge Graph
                </span>
                <span className="text-xs text-slate-500">Autonomous Concept Synthesizer</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Planning Mode & Concept Network
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-normal leading-relaxed">
                Explore how concepts connect across your academic courses. Click any node in the interactive knowledge network to inspect prerequisites, applications, and recommended study paths.
              </p>
            </div>

            {/* Quick Live Search */}
            <div className="w-full md:w-72 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search concepts or course codes..."
                  className="pl-9 h-10 rounded-xl bg-slate-50 border-slate-200 text-xs text-slate-800 focus:bg-white"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── Interactive Concept Knowledge Network Canvas ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* Visual SVG Network Map Area (Left 7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-slate-900">Interactive Curriculum Synapse Graph</h2>
              </div>
              <span className="text-[11px] text-slate-500">Click a node to inspect</span>
            </div>

            {/* SVG Graph Viewport */}
            <div className="relative w-full h-[360px] bg-slate-50/70 rounded-xl border border-slate-100 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 760 360">
                <defs>
                  <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.7" />
                  </linearGradient>
                  <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.08" />
                  </filter>
                </defs>

                {/* Connecting Edges */}
                {edges.map((edge, idx) => {
                  const fromNode = concepts.find((c) => c.id === edge.from);
                  const toNode = concepts.find((c) => c.id === edge.to);
                  if (!fromNode || !toNode) return null;

                  const isEdgeActive =
                    selectedConceptId === edge.from || selectedConceptId === edge.to;

                  // Smooth curve between nodes
                  const midX = (fromNode.x + toNode.x) / 2;
                  const midY = (fromNode.y + toNode.y) / 2 - 15;
                  const pathD = `M ${fromNode.x} ${fromNode.y} Q ${midX} ${midY} ${toNode.x} ${toNode.y}`;

                  return (
                    <g key={idx}>
                      <path
                        d={pathD}
                        fill="none"
                        stroke={isEdgeActive ? '#2563eb' : '#cbd5e1'}
                        strokeWidth={isEdgeActive ? 2.5 : 1.5}
                        strokeDasharray={isEdgeActive ? 'none' : '4 4'}
                        className="transition-all duration-300"
                      />
                      {/* Animated Pulse on active edge */}
                      {isEdgeActive && (
                        <circle r="3.5" fill="#2563eb">
                          <animateMotion
                            repeatCount="indefinite"
                            dur="2.5s"
                            path={pathD}
                          />
                        </circle>
                      )}
                    </g>
                  );
                })}

                {/* Concept Nodes */}
                {concepts.map((node) => {
                  const isSelected = selectedConceptId === node.id;
                  const matchesSearch =
                    searchQuery === '' ||
                    node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    node.courses.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));

                  return (
                    <g
                      key={node.id}
                      onClick={() => setSelectedConceptId(node.id)}
                      className="cursor-pointer transition-transform duration-200"
                      style={{ opacity: matchesSearch ? 1 : 0.3 }}
                    >
                      {/* Pulse ring for selected node */}
                      {isSelected && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r="28"
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2"
                          opacity="0.3"
                          className="animate-ping"
                        />
                      )}

                      {/* Main Node Circle */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isSelected ? '22' : '18'}
                        fill={isSelected ? '#2563eb' : '#ffffff'}
                        stroke={isSelected ? '#1d4ed8' : '#94a3b8'}
                        strokeWidth={isSelected ? '3' : '2'}
                        filter="url(#nodeShadow)"
                        className="transition-all duration-200"
                      />

                      {/* Node Center Dot */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="5"
                        fill={isSelected ? '#ffffff' : '#2563eb'}
                      />

                      {/* Node Label Card below circle */}
                      <foreignObject
                        x={node.x - 70}
                        y={node.y + 24}
                        width="140"
                        height="44"
                        className="overflow-visible"
                      >
                        <div
                          className={`text-center px-1.5 py-0.5 rounded-lg text-[10px] font-semibold leading-tight transition-all shadow-2xs ${
                            isSelected
                              ? 'bg-blue-600 text-white ring-1 ring-blue-700 font-bold'
                              : 'bg-white/95 text-slate-800 border border-slate-200'
                          }`}
                        >
                          <p className="truncate">{node.name.split(' ')[0]} {node.name.split(' ')[1]}</p>
                          <p className={`text-[9px] ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                            {node.courses.join(', ')}
                          </p>
                        </div>
                      </foreignObject>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  Active Selected Node
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  Connected Concepts
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Nodes share mutual prerequisites</span>
            </div>
          </div>

          {/* Node Inspector Details Panel (Right 5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                  Concept Inspector
                </Badge>
                <div className="flex items-center gap-1 text-xs text-amber-600 font-semibold">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>{selectedConcept.rating} Relevance</span>
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2 leading-snug">
                {selectedConcept.name}
              </h3>

              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                {selectedConcept.description}
              </p>

              {/* Associated Courses */}
              <div className="mb-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Appears in Courses
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedConcept.courses.map((course) => (
                    <span
                      key={course}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1"
                    >
                      <BookOpen className="w-3 h-3 text-blue-600" />
                      {course}
                    </span>
                  ))}
                </div>
              </div>

              {/* Instructors Teaching this concept */}
              <div className="mb-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Faculty Experts
                </span>
                <div className="space-y-1.5">
                  {selectedConcept.professors.map((prof) => (
                    <div
                      key={prof}
                      className="flex items-center gap-2 text-xs text-slate-700 p-2 bg-slate-50 rounded-lg border border-slate-100"
                    >
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-medium">{prof}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Practical Real-World Applications */}
              <div className="mb-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Practical Implementations
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedConcept.applications.map((app) => (
                    <span
                      key={app}
                      className="px-2 py-0.5 rounded-md text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-100"
                    >
                      ✓ {app}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Direct Action Link */}
            <div className="pt-3 border-t border-slate-100">
              <Button
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-10 shadow-sm"
                onClick={() => onPracticeConcept(selectedConcept.name)}
              >
                <span>Practice This Concept</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* ─── Interactive Multi-Course Learning Path Roadmap ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                Curated Academic Learning Tracks
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Target milestones linking cross-course prerequisites into actionable study paths
              </p>
            </div>

            {/* Track Switcher Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              {tracks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTrack(t.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedTrack === t.id
                      ? 'bg-white text-slate-900 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Active Track Milestones Timeline */}
          {tracks
            .filter((t) => t.id === selectedTrack)
            .map((track) => (
              <div key={track.id} className="space-y-3">
                <div className="mb-4">
                  <h3 className="font-semibold text-sm text-slate-800">{track.name}</h3>
                  <p className="text-xs text-slate-500">{track.description}</p>
                </div>

                <div className="space-y-2.5">
                  {track.milestones.map((m, idx) => {
                    const isDone = completedMilestones.has(m.id);
                    return (
                      <div
                        key={m.id}
                        role="checkbox"
                        aria-checked={isDone}
                        tabIndex={0}
                        onClick={() => toggleMilestone(m.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            toggleMilestone(m.id);
                          }
                        }}
                        className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                          isDone
                            ? 'bg-emerald-50/50 border-emerald-200 text-slate-900'
                            : 'bg-slate-50/60 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                              isDone ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-5 h-5 fill-emerald-100" />
                            ) : (
                              <Circle className="w-4 h-4" />
                            )}
                          </span>
                          <div>
                            <p className={`text-xs sm:text-sm font-medium ${isDone ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                              {m.title}
                            </p>
                            <span className="text-[10px] text-slate-400 font-normal">
                              Course Requirement: {m.course}
                            </span>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            isDone
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isDone ? 'Completed' : 'Click to Complete'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </motion.div>

      </div>
    </div>
  );
}
