import axios from 'axios';

export const getApiBase = (): string => {
  const custom = typeof window !== 'undefined' ? localStorage.getItem('CANVAS_API_BASE_URL') : null;
  if (custom) return custom;
  return import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8000/api' : '/api');
};

const api = axios.create({
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  config.baseURL = getApiBase();
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Si une réponse HTML (ex: 404 rewrite Firebase) est reçue au lieu d'un JSON API
    if (typeof response.data === 'string' && response.data.trim().toLowerCase().startsWith('<!doctype html')) {
      return Promise.reject(new Error("Le serveur API n'est pas joignable à cette adresse."));
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Types
export interface CanvasStatus {
  connected: boolean;
  domain?: string;
  user_name?: string;
  user_email?: string;
  error?: string;
}

export interface CanvasCourse {
  canvas_id: number;
  name: string;
  course_code: string;
  enrollment_type: string;
  term: string;
  has_syllabus: boolean;
}

export interface Course {
  id: number;
  canvas_id: number;
  name: string;
  course_code: string;
  description?: string;
  syllabus?: string;
  content?: string;
  term?: string;
  synced_at?: string;
  has_content: boolean;
  content_length: number;
}

export interface Fiche {
  id: number;
  course_id: number;
  title: string;
  content: string;
  summary?: string;
  key_concepts?: string[];
  created_at: string;
}

export interface QCMQuestion {
  id: number;
  question: string;
  options: { label: string; text: string }[];
  correct_answer?: string;
  explanation?: string;
  difficulty?: string;
  topic?: string;
}

export interface QCM {
  id: number;
  title: string;
  course_id: number;
  nb_questions: number;
  difficulty: string;
  topic?: string;
  questions: QCMQuestion[];
  created_at: string;
}

export interface QCMResult {
  session_id: number;
  score: number;
  correct: number;
  total: number;
  time_spent?: number;
  grade: string;
  results: {
    question_id: string;
    question: string;
    user_answer: string;
    correct_answer: string;
    is_correct: boolean;
    explanation: string;
    topic: string;
  }[];
}

// Canvas API
export const canvasApi = {
  configure: (domain: string, access_token: string) =>
    api.post('/canvas/configure', { domain, access_token }),
  
  getStatus: () =>
    api.get<CanvasStatus>('/canvas/status'),
  
  disconnect: () =>
    api.delete('/canvas/disconnect'),
};

// Courses API
export const coursesApi = {
  list: () =>
    api.get<Course[]>('/courses/list'),
  
  available: () =>
    api.get<CanvasCourse[]>('/courses/available'),
  
  sync: (canvasCourseId: number) =>
    api.post(`/courses/sync/${canvasCourseId}`),
  
  get: (courseId: number) =>
    api.get<Course>(`/courses/${courseId}`),
  
  delete: (courseId: number) =>
    api.delete(`/courses/${courseId}`),
};

// Fiches API
export const fichesApi = {
  generate: (courseId: number) =>
    api.post<Fiche>(`/fiches/generate/${courseId}`),
  
  listForCourse: (courseId: number) =>
    api.get<Fiche[]>(`/fiches/course/${courseId}`),
  
  get: (ficheId: number) =>
    api.get<Fiche>(`/fiches/${ficheId}`),
  
  delete: (ficheId: number) =>
    api.delete(`/fiches/${ficheId}`),
};

// QCM API
export const qcmApi = {
  generate: (params: {
    course_id: number;
    fiche_id?: number;
    nb_questions: number;
    difficulty: string;
    topic?: string;
  }) => api.post<QCM>('/qcm/generate', params),
  
  listForCourse: (courseId: number) =>
    api.get<QCM[]>(`/qcm/course/${courseId}`),
  
  get: (qcmId: number) =>
    api.get<QCM>(`/qcm/${qcmId}`),
  
  getWithAnswers: (qcmId: number) =>
    api.get<QCM>(`/qcm/${qcmId}/with-answers`),
  
  submit: (qcmId: number, answers: Record<string, string>, timeSpent?: number) =>
    api.post<QCMResult>('/qcm/submit', {
      qcm_id: qcmId,
      answers,
      time_spent: timeSpent
    }),
  
  getSessions: (qcmId: number) =>
    api.get(`/qcm/sessions/${qcmId}`),
  
  delete: (qcmId: number) =>
    api.delete(`/qcm/${qcmId}`),
};

// Export API
export const exportApi = {
  fichePdf: (ficheId: number) =>
    `${getApiBase()}/export/fiche/${ficheId}`,
  
  qcmPdf: (qcmId: number, includeAnswers: boolean = false) =>
    `${getApiBase()}/export/qcm/${qcmId}?include_answers=${includeAnswers}`,
};

export default api;
