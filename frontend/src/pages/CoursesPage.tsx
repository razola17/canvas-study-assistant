import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Download, Plus, RefreshCw, Trash2, Clock, FileText } from 'lucide-react';
import { coursesApi, type Course, type CanvasCourse } from '../api';
import toast from 'react-hot-toast';

export default function CoursesPage() {
  const [savedCourses, setSavedCourses] = useState<Course[]>([]);
  const [availableCourses, setAvailableCourses] = useState<CanvasCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<number | null>(null);
  const [showAvailable, setShowAvailable] = useState(false);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadSavedCourses();
  }, []);

  const loadSavedCourses = async () => {
    setLoading(true);
    try {
      const res = await coursesApi.list();
      setSavedCourses(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Erreur lors du chargement des cours');
      setSavedCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableCourses = async () => {
    setLoadingAvailable(true);
    setShowAvailable(true);
    try {
      const res = await coursesApi.available();
      setAvailableCourses(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Impossible de récupérer les cours Canvas');
      setAvailableCourses([]);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const syncCourse = async (canvasCourseId: number, courseName: string) => {
    setSyncing(canvasCourseId);
    try {
      await coursesApi.sync(canvasCourseId);
      toast.success(`Synchronisation de "${courseName}" lancée !`);
      // Attendre un peu puis recharger
      setTimeout(() => {
        loadSavedCourses();
        setSyncing(null);
      }, 2000);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur de synchronisation');
      setSyncing(null);
    }
  };

  const deleteCourse = async (courseId: number, courseName: string) => {
    if (!confirm(`Supprimer "${courseName}" et toutes ses fiches/QCM ?`)) return;
    try {
      await coursesApi.delete(courseId);
      setSavedCourses(prev => prev.filter(c => c.id !== courseId));
      toast.success('Cours supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const syncedIds = Array.isArray(savedCourses) ? savedCourses.map(c => c.canvas_id) : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes Cours</h1>
          <p className="text-gray-500 mt-1">Gérez et étudiez vos cours Canvas</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadSavedCourses} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
          <button onClick={loadAvailableCourses} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Importer depuis Canvas
          </button>
        </div>
      </div>

      {/* Available Courses Panel */}
      {showAvailable && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600" />
              Cours disponibles sur Canvas
            </h2>
            <button onClick={() => setShowAvailable(false)} className="text-gray-400 hover:text-gray-600 text-sm">
              Fermer
            </button>
          </div>

          {loadingAvailable ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Chargement de vos cours Canvas...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableCourses.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucun cours disponible</p>
              ) : (
                availableCourses.map(course => {
                  const isSynced = syncedIds.includes(course.canvas_id);
                  const isSyncing = syncing === course.canvas_id;
                  return (
                    <div key={course.canvas_id}
                         className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <div className="font-medium text-gray-900">{course.name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-3 mt-0.5">
                          <span>{course.course_code}</span>
                          {course.term && <span>• {course.term}</span>}
                          {course.has_syllabus && (
                            <span className="text-green-600">• Syllabus disponible</span>
                          )}
                        </div>
                      </div>
                      {isSynced ? (
                        <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                          ✓ Importé
                        </span>
                      ) : (
                        <button
                          onClick={() => syncCourse(course.canvas_id, course.name)}
                          disabled={isSyncing}
                          className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1"
                        >
                          {isSyncing ? (
                            <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Import...</>
                          ) : (
                            <><Download className="w-3 h-3" /> Importer</>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Saved Courses */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Chargement...</p>
        </div>
      ) : savedCourses.length === 0 ? (
        <div className="text-center py-16 card">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Aucun cours importé</h3>
          <p className="text-gray-400 mb-4">Importez vos cours depuis Canvas pour commencer à étudier</p>
          <button onClick={loadAvailableCourses} className="btn-primary">
            Importer depuis Canvas
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedCourses.map(course => (
            <div key={course.id}
                 className="card hover:shadow-md transition-shadow cursor-pointer group"
                 onClick={() => navigate(`/courses/${course.id}`)}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteCourse(course.id, course.name); }}
                  className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{course.name}</h3>
              {course.course_code && (
                <p className="text-sm text-gray-500 mb-3">{course.course_code}</p>
              )}
              {course.term && (
                <p className="text-xs text-gray-400 mb-3">{course.term}</p>
              )}

              <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  {course.has_content ? (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <FileText className="w-3 h-3" />
                      {(course.content_length / 1000).toFixed(0)}k caractères
                    </span>
                  ) : (
                    <span className="text-xs text-amber-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Synchronisation...
                    </span>
                  )}
                </div>
                {course.synced_at && (
                  <span className="text-xs text-gray-400">
                    {new Date(course.synced_at).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
