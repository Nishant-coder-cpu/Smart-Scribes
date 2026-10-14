export type UserRole = 'student' | 'professor';
export type StudentMode = 'lectures' | 'planning' | 'projects';
export type ProfessorView = 'courses' | 'doubts';
export type StudentDialog = 'qna' | 'doubts' | null;

export interface NavigationSession {
  isLoggedIn: boolean;
  role: UserRole | null;
  institute: string;
  // Student dashboard state
  mode: StudentMode;
  courseId: string | null;
  lectureId: string | null;
  dialog: StudentDialog;
  // Professor dashboard state
  view: ProfessorView;
}

const STORAGE_KEY = 'smart-scribes:navigation-session';

/**
 * Retrieves the current navigation state from URL search params with fallback to localStorage.
 */
export function getNavigationSession(): NavigationSession {
  const defaultSession: NavigationSession = {
    isLoggedIn: false,
    role: null,
    institute: '',
    mode: 'lectures',
    courseId: null,
    lectureId: null,
    dialog: null,
    view: 'courses',
  };

  if (typeof window === 'undefined') {
    return defaultSession;
  }

  // 1. Read stored session from localStorage
  let stored: Partial<NavigationSession> = {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      stored = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to read session from localStorage:', err);
  }

  // 2. Read parameters from URL
  let urlParams: URLSearchParams | null = null;
  try {
    urlParams = new URLSearchParams(window.location.search);
  } catch (err) {
    console.warn('Failed to parse search params:', err);
  }

  const roleParam = urlParams?.get('role') as UserRole | null;
  const instituteParam = urlParams?.get('institute');
  const modeParam = urlParams?.get('mode') as StudentMode | null;
  const courseParam = urlParams?.get('course') || urlParams?.get('courseId');
  const lectureParam = urlParams?.get('lecture') || urlParams?.get('lectureId');
  const viewParam = urlParams?.get('view') as ProfessorView | null;
  const dialogParam = urlParams?.get('dialog') as StudentDialog | null;

  const validRoles: UserRole[] = ['student', 'professor'];
  let role: UserRole | null = null;
  if (roleParam && validRoles.includes(roleParam)) {
    role = roleParam;
  } else if (stored.role && validRoles.includes(stored.role)) {
    role = stored.role;
  }

  // User is logged in if role is specified in URL or valid saved session exists
  const isLoggedIn = Boolean(
    (roleParam && validRoles.includes(roleParam)) ||
    (stored.isLoggedIn && role)
  );

  const institute = instituteParam || stored.institute || '';

  const validModes: StudentMode[] = ['lectures', 'planning', 'projects'];
  let mode: StudentMode = 'lectures';
  if (modeParam && validModes.includes(modeParam)) {
    mode = modeParam;
  } else if (stored.mode && validModes.includes(stored.mode)) {
    mode = stored.mode;
  }

  const validViews: ProfessorView[] = ['courses', 'doubts'];
  let view: ProfessorView = 'courses';
  if (viewParam && validViews.includes(viewParam)) {
    view = viewParam;
  } else if (stored.view && validViews.includes(stored.view)) {
    view = stored.view;
  }

  const courseId = courseParam || stored.courseId || null;
  const lectureId = lectureParam || stored.lectureId || null;
  const dialog = (dialogParam === 'qna' || dialogParam === 'doubts')
    ? dialogParam
    : (stored.dialog || null);

  return {
    isLoggedIn,
    role,
    institute,
    mode,
    courseId,
    lectureId,
    dialog,
    view,
  };
}

/**
 * Saves current navigation state to localStorage and synchronizes with URL parameters.
 */
export function saveNavigationSession(
  updates: Partial<NavigationSession>,
  options: { pushHistory?: boolean } = {}
) {
  if (typeof window === 'undefined') return;

  try {
    const current = getNavigationSession();
    const merged: NavigationSession = {
      ...current,
      ...updates,
      isLoggedIn: updates.isLoggedIn !== undefined 
        ? updates.isLoggedIn 
        : (updates.role ? true : current.isLoggedIn),
    };

    // Save state to localStorage
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

    // Synchronize URL query parameters
    const params = new URLSearchParams();

    if (merged.isLoggedIn && merged.role) {
      params.set('role', merged.role);
      if (merged.institute) {
        params.set('institute', merged.institute);
      }

      if (merged.role === 'student') {
        if (merged.mode) {
          params.set('mode', merged.mode);
        }
        if (merged.courseId) {
          params.set('course', merged.courseId);
        }
        if (merged.mode === 'lectures' && merged.lectureId) {
          params.set('lecture', merged.lectureId);
        }
        if (merged.dialog) {
          params.set('dialog', merged.dialog);
        }
      } else if (merged.role === 'professor') {
        if (merged.view) {
          params.set('view', merged.view);
        }
        if (merged.courseId) {
          params.set('course', merged.courseId);
        }
      }
    }

    const query = params.toString();
    const newUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (newUrl !== currentUrl) {
      if (options.pushHistory) {
        window.history.pushState(merged, '', newUrl);
      } else {
        window.history.replaceState(merged, '', newUrl);
      }
    }
  } catch (err) {
    console.warn('Failed to save navigation session:', err);
  }
}

/**
 * Clears the stored session and resets URL query parameters.
 */
export function clearNavigationSession() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.history.replaceState({}, '', window.location.pathname);
  } catch (err) {
    console.warn('Failed to clear navigation session:', err);
  }
}

/**
 * Subscribes to browser back/forward popstate events to keep component state in sync.
 */
export function onNavigationSessionChange(callback: (session: NavigationSession) => void) {
  if (typeof window === 'undefined') return () => {};

  const handlePopState = () => {
    callback(getNavigationSession());
  };

  window.addEventListener('popstate', handlePopState);
  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
}
