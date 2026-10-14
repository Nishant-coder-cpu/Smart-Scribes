'use client';

import { useState, useEffect } from 'react';
import { LandingPage } from '../src/components/LandingPage';
import { StudentDashboard } from '../src/components/StudentDashboard';
import { ProfessorDashboard } from '../src/components/ProfessorDashboard';
import {
  getNavigationSession,
  saveNavigationSession,
  clearNavigationSession,
  onNavigationSessionChange,
} from '../src/lib/navigation-state';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'student' | 'professor' | null>(null);
  const [selectedInstitute, setSelectedInstitute] = useState<string>('');

  useEffect(() => {
    // Restore session on mount (from URL query params or localStorage)
    const session = getNavigationSession();
    if (session.isLoggedIn && session.role) {
      setIsLoggedIn(true);
      setUserRole(session.role);
      setSelectedInstitute(session.institute || '');
    }
    setMounted(true);

    // Keep session in sync with browser Back/Forward navigation
    return onNavigationSessionChange((updatedSession) => {
      if (updatedSession.isLoggedIn && updatedSession.role) {
        setIsLoggedIn(true);
        setUserRole(updatedSession.role);
        setSelectedInstitute(updatedSession.institute || '');
      } else {
        setIsLoggedIn(false);
        setUserRole(null);
        setSelectedInstitute('');
      }
    });
  }, []);

  const handleLogin = (role: 'student' | 'professor', institute: string) => {
    setUserRole(role);
    setSelectedInstitute(institute);
    setIsLoggedIn(true);
    saveNavigationSession(
      {
        isLoggedIn: true,
        role,
        institute,
      },
      { pushHistory: true }
    );
  };

  const handleLogout = () => {
    clearNavigationSession();
    setIsLoggedIn(false);
    setUserRole(null);
    setSelectedInstitute('');
  };

  // Prevent flash or hydration mismatch while reading session on client mount
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FBF9F5]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-[#846b52]" />
          <p className="text-xs text-[#7d6e5d] font-medium tracking-wide">Loading Smart Scribes...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LandingPage onLogin={handleLogin} />;
  }

  if (userRole === 'student') {
    return <StudentDashboard onLogout={handleLogout} />;
  }

  if (userRole === 'professor') {
    return <ProfessorDashboard onLogout={handleLogout} />;
  }

  return <LandingPage onLogin={handleLogin} />;
}