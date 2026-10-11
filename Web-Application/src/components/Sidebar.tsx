import { motion } from 'framer-motion';
import { BookOpen, Lightbulb, FolderKanban, LogOut, Brain, ChevronRight, GraduationCap } from 'lucide-react';
import { Course } from '../types';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

interface SidebarProps {
  courses: Course[];
  selectedCourse: string | null;
  onCourseSelect: (courseId: string) => void;
  currentMode: 'lectures' | 'planning' | 'projects';
  onModeChange: (mode: 'lectures' | 'planning' | 'projects') => void;
  onLogout: () => void;
}

export function Sidebar({
  courses,
  selectedCourse,
  onCourseSelect,
  currentMode,
  onModeChange,
  onLogout,
}: SidebarProps) {
  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen select-none">
      {/* Brand & Workspace Indicator */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight">Smart Scribes</h1>
            <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
              <GraduationCap className="w-3 h-3 text-blue-600" />
              Student Workspace
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Modes */}
      <div className="p-3 space-y-1">
        <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
          Workspace Modes
        </span>

        <button
          onClick={() => onModeChange('lectures')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
            currentMode === 'lectures'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4" />
            <span>Lectures & Notes</span>
          </div>
          {currentMode === 'lectures' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
        </button>

        <button
          onClick={() => onModeChange('planning')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
            currentMode === 'planning'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Lightbulb className="w-4 h-4" />
            <span>Concept Network</span>
          </div>
          {currentMode === 'planning' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
        </button>

        <button
          onClick={() => onModeChange('projects')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
            currentMode === 'projects'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FolderKanban className="w-4 h-4" />
            <span>Project Planner</span>
          </div>
          {currentMode === 'projects' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
        </button>
      </div>

      <div className="px-4 py-1">
        <Separator className="bg-slate-200" />
      </div>

      {/* Course List (When in Lectures mode) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Enrolled Courses
          </span>
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
            {courses.length}
          </span>
        </div>

        <div className="space-y-1">
          {courses.map((course) => {
            const isSelected = selectedCourse === course.id;
            return (
              <motion.div
                key={course.id}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <button
                  onClick={() => {
                    onCourseSelect(course.id);
                    if (currentMode !== 'lectures') {
                      onModeChange('lectures');
                    }
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition-all border ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-300/80 text-blue-950 shadow-2xs font-medium'
                      : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${isSelected ? 'text-blue-700' : 'text-slate-900'}`}>
                      {course.code}
                    </span>
                    {isSelected && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600 bg-blue-100/70 px-1.5 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate leading-snug">
                    {course.name}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 truncate">
                    {course.professor}
                  </p>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Logout Button */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/60">
        <Button
          variant="ghost"
          className="w-full justify-start text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl h-9"
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          <span>Exit Workspace</span>
        </Button>
      </div>
    </div>
  );
}
