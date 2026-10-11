import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, CheckCircle2, Circle } from 'lucide-react';
import { Lecture } from '../types';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

interface LectureNavProps {
  lectures: Lecture[];
  selectedLecture: string | null;
  onLectureSelect: (lectureId: string) => void;
}

export function LectureNav({ lectures, selectedLecture, onLectureSelect }: LectureNavProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedLecture && scrollContainerRef.current) {
      const selectedElement = scrollContainerRef.current.querySelector(
        `[data-lecture-id="${selectedLecture}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedLecture]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const selectedIndex = lectures.findIndex((l) => l.id === selectedLecture);

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3 select-none">
      <div className="flex items-center gap-3 max-w-7xl mx-auto">
        {/* Navigation Indicator Badge */}
        <div className="hidden sm:flex items-center gap-2 pr-3 border-r border-slate-200 text-xs font-medium text-slate-500 shrink-0">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span>Timeline</span>
          <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full text-[11px]">
            {lectures.length} Lectures
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => scroll('left')}
          className="shrink-0 h-9 w-9 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          title="Previous lectures"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Horizontal Timeline Track with connecting line */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto scrollbar-hide py-1 relative"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex items-center gap-3 min-w-max relative px-2">
            {lectures.map((lecture, idx) => {
              const isSelected = selectedLecture === lecture.id;
              const isCompleted = selectedIndex !== -1 && idx < selectedIndex;

              return (
                <div key={lecture.id} className="flex items-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.button
                          data-lecture-id={lecture.id}
                          whileHover={{ scale: 1.03, y: -1 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => onLectureSelect(lecture.id)}
                          className={`relative flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-left transition-all border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20 font-medium'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-slate-50/80 shadow-2xs'
                          }`}
                        >
                          {/* Node Icon Indicator */}
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : isCompleted
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              lecture.number
                            )}
                          </div>

                          <div className="flex flex-col">
                            <span className="text-xs font-semibold whitespace-nowrap">
                              Lecture {lecture.number}
                            </span>
                            <span
                              className={`text-[10px] flex items-center gap-1 ${
                                isSelected ? 'text-blue-100' : 'text-slate-400'
                              }`}
                            >
                              <Calendar className="w-2.5 h-2.5" />
                              {new Date(lecture.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>

                          {/* Active Pulsing Dot */}
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white ml-1 animate-ping" />
                          )}
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        <p className="font-semibold text-slate-800">{lecture.topic}</p>
                        <p className="text-[11px] text-slate-500">Lecture {lecture.number} • Click to open notes</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Connecting Timeline Segment between lecture nodes */}
                  {idx < lectures.length - 1 && (
                    <div
                      className={`w-4 h-[2px] mx-1 transition-colors ${
                        selectedIndex > idx
                          ? 'bg-blue-500'
                          : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => scroll('right')}
          className="shrink-0 h-9 w-9 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          title="Next lectures"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
