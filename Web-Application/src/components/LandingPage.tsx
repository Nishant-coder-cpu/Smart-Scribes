'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, Brain, Sparkles, ArrowRight, Zap, CheckCircle2, School } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { getInstitutes } from '../lib/api';
import { Institute } from '../types';

interface LandingPageProps {
  onLogin: (role: 'student' | 'professor', institute: string) => void;
}

/* ──────────────── Background Neural Network Grid & Constellation ──────────────── */
function NeuralBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Subtle radial dot grid */}
      <div
        className="absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage: 'radial-gradient(#b8a58e 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Background organic neural swoops */}
      <svg
        className="absolute w-full h-[600px] top-0 left-0 opacity-[0.35]"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
      >
        <defs>
          <linearGradient id="bgGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c5b29b" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#a98d72" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#c5b29b" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {/* Soft curving wave arcs matching the screenshot */}
        <path
          d="M -100 120 C 250 80 400 240 850 140 C 1100 80 1300 200 1600 120"
          stroke="url(#bgGrad1)"
          strokeWidth="1.2"
          strokeDasharray="4 8"
        />
        <path
          d="M -50 280 C 300 320 600 160 1000 260 C 1300 340 1500 200 1700 260"
          stroke="url(#bgGrad1)"
          strokeWidth="1.2"
        />
        <path
          d="M 100 420 C 450 380 750 480 1150 400 C 1350 360 1550 440 1750 410"
          stroke="url(#bgGrad1)"
          strokeWidth="1"
          strokeDasharray="3 6"
        />
      </svg>
    </div>
  );
}

/* ──────────────── Neural Connection Lines Connecting Smart Scribes to the 4 Cards ──────────────── */
interface NeuralNetworkProps {
  activeCardIndex: number | null;
}

function NeuralConnectorNetwork({ activeCardIndex }: NeuralNetworkProps) {
  // Desktop 4-way bezier paths: from center (500, 10) down to the 4 card anchors (125, 375, 625, 875) at y=150
  const paths = [
    { id: 0, d: 'M 500 10 C 460 70, 160 65, 125 150', endX: 125, endY: 150, delay: '0s' },
    { id: 1, d: 'M 500 10 C 485 70, 395 70, 375 150', endX: 375, endY: 150, delay: '0.8s' },
    { id: 2, d: 'M 500 10 C 515 70, 605 70, 625 150', endX: 625, endY: 150, delay: '1.6s' },
    { id: 3, d: 'M 500 10 C 540 70, 840 65, 875 150', endX: 875, endY: 150, delay: '2.4s' },
  ];

  return (
    <div className="hidden lg:block w-full h-[150px] relative pointer-events-none -mb-3 z-10">
      <svg
        className="w-full h-full overflow-visible"
        viewBox="0 0 1000 150"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="neuralStroke" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#a78b71" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#cbbca8" stopOpacity="0.45" />
          </linearGradient>

          <linearGradient id="neuralActiveStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b48858" stopOpacity="1" />
            <stop offset="100%" stopColor="#d8a86a" stopOpacity="0.9" />
          </linearGradient>

          <radialGradient id="pulseGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d4af37" stopOpacity="1" />
            <stop offset="60%" stopColor="#a78b71" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#a78b71" stopOpacity="0" />
          </radialGradient>

          <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Central Root Synapse Node (Anchor below Smart Scribes) */}
        <circle cx="500" cy="10" r="6" fill="#a78b71" filter="url(#glowFilter)" />
        <circle cx="500" cy="10" r="10" fill="none" stroke="#a78b71" strokeWidth="1.5" opacity="0.4" />
        <circle cx="500" cy="10" r="15" fill="none" stroke="#a78b71" strokeWidth="1" strokeDasharray="2 3" opacity="0.3" />

        {/* Lateral Synaptic Cross-Connections between adjacent card targets */}
        <path
          d="M 125 145 Q 250 135 375 145"
          fill="none"
          stroke="#cbbca8"
          strokeWidth="1.2"
          strokeDasharray="4 6"
          opacity="0.5"
        />
        <path
          d="M 375 145 Q 500 135 625 145"
          fill="none"
          stroke="#cbbca8"
          strokeWidth="1.2"
          strokeDasharray="4 6"
          opacity="0.5"
        />
        <path
          d="M 625 145 Q 750 135 875 145"
          fill="none"
          stroke="#cbbca8"
          strokeWidth="1.2"
          strokeDasharray="4 6"
          opacity="0.5"
        />

        {/* 4 Main Axon Pathways connecting Smart Scribes to the 4 Cards */}
        {paths.map((p) => {
          const isActive = activeCardIndex === p.id;
          return (
            <g key={p.id}>
              {/* Outer faint aura for active line */}
              {isActive && (
                <path
                  d={p.d}
                  fill="none"
                  stroke="#b48858"
                  strokeWidth="5"
                  opacity="0.3"
                  filter="url(#glowFilter)"
                />
              )}

              {/* Main pathway curve */}
              <path
                id={`path-${p.id}`}
                d={p.d}
                fill="none"
                stroke={isActive ? 'url(#neuralActiveStroke)' : 'url(#neuralStroke)'}
                strokeWidth={isActive ? 2.5 : 1.8}
                className="transition-all duration-300"
              />

              {/* Secondary dashed impulse carrier */}
              <path
                d={p.d}
                fill="none"
                stroke="#d4af37"
                strokeWidth="1.2"
                strokeDasharray="4 8"
                opacity={isActive ? 0.9 : 0.4}
              />

              {/* Terminal Synapse Node touching each card */}
              <circle
                cx={p.endX}
                cy={p.endY}
                r={isActive ? 6 : 4.5}
                fill={isActive ? '#b48858' : '#a78b71'}
                filter="url(#glowFilter)"
                className="transition-all duration-300"
              />
              <circle
                cx={p.endX}
                cy={p.endY}
                r={isActive ? 11 : 8}
                fill="none"
                stroke="#a78b71"
                strokeWidth="1"
                opacity={isActive ? 0.6 : 0.3}
              />

              {/* Travelling Neural Impulse Pulse (Animated Particle) */}
              <circle r={isActive ? 4.5 : 3.5} fill="#d4af37" filter="url(#glowFilter)">
                <animateMotion
                  repeatCount="indefinite"
                  dur={isActive ? '1.8s' : '3.2s'}
                  begin={p.delay}
                  path={p.d}
                />
              </circle>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ──────────────── Main Landing Page Component ──────────────── */
export function LandingPage({ onLogin }: LandingPageProps) {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [selectedRole, setSelectedRole] = useState<'student' | 'professor' | null>(null);
  const [selectedInstitute, setSelectedInstitute] = useState<string>('');
  const [studentGmail, setStudentGmail] = useState<string>('');
  const [studentCourse, setStudentCourse] = useState<string>('');
  const [studentYear, setStudentYear] = useState<string>('');
  const [profGmail, setProfGmail] = useState<string>('');
  const [showAllInstitutes, setShowAllInstitutes] = useState<boolean>(false);
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);

  useEffect(() => {
    async function loadInstitutes() {
      try {
        const institutesData = await getInstitutes();
        setInstitutes(institutesData);
      } catch (error) {
        console.error('Error loading institutes:', error);
      }
    }
    loadInstitutes();
  }, []);

  const initialInstitutesToShow = 6;
  const visibleInstitutes = showAllInstitutes ? institutes : institutes.slice(0, initialInstitutesToShow);

  const handleContinue = () => {
    if (selectedRole && selectedInstitute) {
      if (selectedRole === 'student') {
        if (!studentGmail || !studentCourse || !studentYear) {
          alert('Please fill in all student details.');
          return;
        }
        if (studentGmail !== 'demo@gmail.com') {
          alert('Please enter a valid Gmail or use demo Gmail');
          return;
        }
      }
      if (selectedRole === 'professor') {
        if (!profGmail) {
          alert('Please enter your email.');
          return;
        }
        if (profGmail !== 'demo@gmail.com') {
          alert('Please enter a valid Gmail or use demo Gmail');
          return;
        }
      }
      onLogin(selectedRole, selectedInstitute);
    }
  };

  const featureCards = [
    {
      icon: Zap,
      title: 'Multimodal AI Processing',
      subtitle: 'Realtime video & audio synthesis',
    },
    {
      icon: BookOpen,
      title: 'Auto-Generated Notes',
      subtitle: 'Structured topics & deep summaries',
    },
    {
      icon: Brain,
      title: 'Math & Code Visuals',
      subtitle: 'AI Manim animations on the fly',
    },
    {
      icon: GraduationCap,
      title: 'Adaptive Quizzing',
      subtitle: 'Intelligent QnA & doubt resolution',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#2C231A] relative overflow-hidden flex flex-col justify-between selection:bg-[#EADDCB] selection:text-[#2C231A]">
      {/* Neural Background Mesh & Arc Lines */}
      <NeuralBackground />

      <div className="container mx-auto px-4 py-8 relative z-10 max-w-6xl">
        {/* ─── Hero Section ─── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center pt-6 md:pt-10 mb-4"
        >
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f4ece1] border border-[#e4d8c6] text-[#7d6850] text-[11px] font-semibold tracking-wider uppercase mb-5 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#a78b71]" />
            <span>Next-Gen AI Classroom Platform</span>
          </div>

          {/* Logo Mark + Title */}
          <div className="flex items-center justify-center gap-3.5 mb-3">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white border border-[#e8ded0] shadow-sm flex items-center justify-center p-2.5">
              <Brain className="w-full h-full text-[#7d6850]" strokeWidth={1.75} />
            </div>
            <h1 className="font-serif italic text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#2C231A]">
              Smart <span className="text-[#846b52]">Scribes</span>
            </h1>
          </div>

          {/* Subtitle */}
          <p className="text-[#7d6e5d] text-sm md:text-base max-w-2xl mx-auto leading-relaxed font-normal">
            AI-Powered Classroom Intelligence — Transforming Live Lectures into Interactive Multimedia Knowledge Notes
          </p>
        </motion.div>

        {/* ─── Neural Network Connection Lines Layer ─── */}
        <NeuralConnectorNetwork activeCardIndex={hoveredCardIndex} />

        {/* ─── 4 Feature Cards Connected to Smart Scribes ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-16 relative z-20"
        >
          {featureCards.map((card, idx) => {
            const isHovered = hoveredCardIndex === idx;
            return (
              <motion.div
                key={idx}
                onMouseEnter={() => setHoveredCardIndex(idx)}
                onMouseLeave={() => setHoveredCardIndex(null)}
                whileHover={{ y: -4, scale: 1.015 }}
                transition={{ duration: 0.2 }}
                className={`relative rounded-3xl p-6 bg-white/95 border transition-all duration-300 shadow-xs group cursor-default ${
                  isHovered
                    ? 'border-[#a78b71] ring-2 ring-[#a78b71]/20 shadow-md'
                    : 'border-[#ede5d8] hover:border-[#cfbeaa]'
                }`}
              >
                {/* Visual Connection Node at the top center of each card */}
                <div
                  className={`hidden lg:block absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full transition-all duration-300 ${
                    isHovered
                      ? 'bg-[#b48858] ring-4 ring-[#f4ece1] scale-125'
                      : 'bg-[#a78b71] ring-3 ring-white'
                  }`}
                />

                {/* Card Icon */}
                <div className="w-11 h-11 rounded-2xl bg-[#F6EFE6] border border-[#e7dac9] flex items-center justify-center text-[#7d6850] mb-4 group-hover:scale-105 transition-transform">
                  <card.icon className="w-5 h-5" strokeWidth={1.8} />
                </div>

                {/* Card Title & Subtitle */}
                <h3 className="font-semibold text-sm md:text-[15px] text-[#2C231A] mb-1 leading-snug">
                  {card.title}
                </h3>
                <p className="text-xs text-[#7d6e5d] leading-relaxed">
                  {card.subtitle}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ─── Role Selection Section ─── */}
        {!selectedRole && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-12"
          >
            <div className="text-center mb-8">
              <h2 className="font-serif italic text-2xl md:text-3xl font-bold text-[#2C231A]">
                Select Your Experience
              </h2>
              <p className="text-sm text-[#7d6e5d] mt-1 font-normal">
                Choose your portal to enter the interactive lecture intelligence system
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Student Portal Card */}
              <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}>
                <div
                  onClick={() => setSelectedRole('student')}
                  className="rounded-3xl p-8 bg-white border border-[#ede5d8] hover:border-[#a78b71] hover:ring-2 hover:ring-[#a78b71]/20 shadow-xs hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#F6EFE6] border border-[#e7dac9] flex items-center justify-center text-[#7d6850] mb-5 group-hover:scale-105 transition-transform">
                    <GraduationCap className="w-7 h-7" strokeWidth={1.8} />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#a78b71] bg-[#f4ece1] px-2.5 py-1 rounded-full mb-2 inline-block">
                    Student Portal
                  </span>
                  <h3 className="font-serif italic text-2xl font-bold text-[#2C231A] mb-2">
                    Student Space
                  </h3>
                  <p className="text-sm text-[#7d6e5d] leading-relaxed mb-6 font-normal">
                    Access lecture notes, dynamic AI tutor, custom quizzes, and visual Manim animations.
                  </p>
                  <div className="flex items-center text-sm font-semibold text-[#846b52] gap-1.5 group-hover:gap-2.5 transition-all">
                    <span>Enter as Student</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>

              {/* Professor Portal Card */}
              <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}>
                <div
                  onClick={() => setSelectedRole('professor')}
                  className="rounded-3xl p-8 bg-white border border-[#ede5d8] hover:border-[#a78b71] hover:ring-2 hover:ring-[#a78b71]/20 shadow-xs hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#F6EFE6] border border-[#e7dac9] flex items-center justify-center text-[#7d6850] mb-5 group-hover:scale-105 transition-transform">
                    <BookOpen className="w-7 h-7" strokeWidth={1.8} />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#a78b71] bg-[#f4ece1] px-2.5 py-1 rounded-full mb-2 inline-block">
                    Faculty Portal
                  </span>
                  <h3 className="font-serif italic text-2xl font-bold text-[#2C231A] mb-2">
                    Professor Studio
                  </h3>
                  <p className="text-sm text-[#7d6e5d] leading-relaxed mb-6 font-normal">
                    Manage course lectures, monitor student comprehension, and address doubts in real time.
                  </p>
                  <div className="flex items-center text-sm font-semibold text-[#846b52] gap-1.5 group-hover:gap-2.5 transition-all">
                    <span>Enter as Professor</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ─── Institute Selection & Form ─── */}
        {selectedRole && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white rounded-3xl p-8 border border-[#ede5d8] shadow-sm mb-8">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#f0e7db]">
                <div>
                  <h2 className="font-serif italic text-2xl font-bold text-[#2C231A]">
                    {selectedRole === 'student' ? 'Student Sign In' : 'Professor Sign In'}
                  </h2>
                  <p className="text-sm text-[#7d6e5d] mt-0.5 font-normal">
                    Select your institution and enter your credentials to proceed
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRole(null)}
                  className="rounded-xl border-[#dcd0be] text-xs font-semibold text-[#5c4a36] hover:bg-[#F6EFE6]"
                >
                  Switch Role
                </Button>
              </div>

              {/* Institute Grid */}
              <div className="mb-6">
                <span className="text-xs uppercase font-bold tracking-wider text-[#7d6e5d] mb-3 block">
                  Select Institute
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {visibleInstitutes.map((institute) => {
                    const isSelected = selectedInstitute === institute.id;
                    return (
                      <motion.div key={institute.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <div
                          className={`p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-3.5 border ${
                            isSelected
                              ? 'bg-[#F6EFE6] border-[#a78b71] ring-2 ring-[#a78b71]/25 shadow-xs'
                              : 'bg-white border-[#ede5d8] hover:border-[#d2c2af]'
                          }`}
                          onClick={() => setSelectedInstitute(institute.id)}
                        >
                          <img
                            src={institute.logo}
                            alt={institute.name}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-[#e4d8c6] shadow-xs"
                          />
                          <div className="overflow-hidden">
                            <h3 className="text-sm font-semibold text-[#2C231A] truncate">{institute.name}</h3>
                            <p className="text-xs text-[#7d6e5d] font-normal">Authorized Campus</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {institutes.length > initialInstitutesToShow && (
                  <div className="text-center mt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllInstitutes(!showAllInstitutes)}
                      className="text-[#846b52] hover:bg-[#F6EFE6] text-xs font-semibold"
                    >
                      {showAllInstitutes ? 'Show Less' : 'Show More Institutes'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Student Details Form */}
              {selectedRole === 'student' && selectedInstitute && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 pt-4 mb-8 border-t border-[#f0e7db]"
                >
                  <h3 className="text-base font-semibold text-[#2C231A]">Student Profile Credentials</h3>
                  <div>
                    <Label htmlFor="studentGmail" className="text-xs text-[#7d6e5d] mb-1.5 block font-medium">
                      Email Address
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="studentGmail"
                        type="email"
                        placeholder="Enter your Gmail"
                        value={studentGmail}
                        onChange={(e) => setStudentGmail(e.target.value)}
                        className="rounded-xl border-[#dcd0be] bg-[#FBF9F5]"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStudentGmail('demo@gmail.com')}
                        className="rounded-xl border-[#dcd0be] text-xs text-[#5c4a36] hover:bg-[#F6EFE6]"
                      >
                        Demo Key
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="studentCourse" className="text-xs text-[#7d6e5d] mb-1.5 block font-medium">
                        Course
                      </Label>
                      <Select onValueChange={setStudentCourse} value={studentCourse}>
                        <SelectTrigger className="w-full rounded-xl border-[#dcd0be] bg-[#FBF9F5]">
                          <SelectValue placeholder="Select Course" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-[#dcd0be]">
                          <SelectItem value="B.Tech">B.Tech</SelectItem>
                          <SelectItem value="M.Tech">M.Tech</SelectItem>
                          <SelectItem value="PhD">PhD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="studentYear" className="text-xs text-[#7d6e5d] mb-1.5 block font-medium">
                        Academic Year
                      </Label>
                      <Select onValueChange={setStudentYear} value={studentYear}>
                        <SelectTrigger className="w-full rounded-xl border-[#dcd0be] bg-[#FBF9F5]">
                          <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-[#dcd0be]">
                          <SelectItem value="1st">1st Year</SelectItem>
                          <SelectItem value="2nd">2nd Year</SelectItem>
                          <SelectItem value="3rd">3rd Year</SelectItem>
                          <SelectItem value="4th">4th Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Professor Details Form */}
              {selectedRole === 'professor' && selectedInstitute && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 pt-4 mb-8 border-t border-[#f0e7db]"
                >
                  <h3 className="text-base font-semibold text-[#2C231A]">Faculty Credentials</h3>
                  <div>
                    <Label htmlFor="profGmail" className="text-xs text-[#7d6e5d] mb-1.5 block font-medium">
                      University Email
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="profGmail"
                        type="email"
                        placeholder="Enter your email"
                        value={profGmail}
                        onChange={(e) => setProfGmail(e.target.value)}
                        className="rounded-xl border-[#dcd0be] bg-[#FBF9F5]"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setProfGmail('demo@gmail.com')}
                        className="rounded-xl border-[#dcd0be] text-xs text-[#5c4a36] hover:bg-[#F6EFE6]"
                      >
                        Demo Key
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Continue Button */}
              <div className="text-center pt-2">
                <Button
                  size="lg"
                  onClick={handleContinue}
                  disabled={!selectedInstitute}
                  className="w-full sm:w-auto px-12 h-12 text-sm font-semibold rounded-2xl bg-[#846b52] hover:bg-[#6e583c] text-white shadow-md transition-all"
                >
                  <span>Continue to {selectedRole === 'student' ? 'Student Workspace' : 'Professor Studio'}</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── Footer ─── */}
        <div className="text-center text-xs text-[#9a8c7b] py-6 font-normal">
          <p>© 2025 Smart Scribes • Powered by Multimodal LLMs & Autonomous Classroom Pipeline</p>
        </div>
      </div>
    </div>
  );
}
