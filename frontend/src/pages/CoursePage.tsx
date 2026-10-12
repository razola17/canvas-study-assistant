import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, ClipboardList, Sparkles,
  Download, Trash2, Plus, ChevronRight, AlertCircle
} from 'lucide-react';
import { coursesApi, fichesApi, qcmApi, type Course, type Fiche, type QCM } from '../api';
import QCMGeneratorModal from '../components/QCMGeneratorModal';
import toast from 'react-hot-toast';

export default function CoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [fiches, setFiches] = useState<Fiche[]>([]);
  const [qcms, setQcms] = useState<QCM[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingFiche, setGeneratingFiche] = useState(false);
  const [showQCMModal, setShowQCMModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'fiches' | 'qcm'>('fiches');

  useEffect(() => {
    if (courseId) loadAll(parseInt(courseId));
  }, [courseId]);

  const loadAll = async (id: number) => {
    setLoading(true);
    try {
      const [courseRes, fichesRes, qcmsRes] = await Promise.all([
        coursesApi.get(id),
        fichesApi.listForCourse(id),
        qcmApi.listForCourse(id),
      ]);
      setCourse(courseRes.data && typeof courseRes.data === 'object' && 'id' in courseRes.data ? courseRes.data : null);
      setFiches(Array.isArray(fichesRes.data) ? fichesRes.data : []);
      setQcms(Array.isArray(qcmsRes.data) ? (qcmsRes.data as unknown as QCM[]) : []);
    } catch {
      toast.error('Erreur de chargement');
      setFiches([]);
      setQcms([]);
    } finally {
      setLoading(false);
    }
  };

  const generateFiche = async () => {
    if (!course) return;
    setGeneratingFiche(true);
    try {
      const res = await fichesApi.generate(course.id);
      setFiches(prev => [res.data, ...prev]);
      setActiveTab('fiches');
      toast.success('Fiche générée avec succès !');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur de génération');
    } finally {
      setGeneratingFiche(false);
    }
  };

  const deleteFiche = async (ficheId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Supprimer cette fiche ?')) return;
    try {
      await fichesApi.delete(ficheId);
      setFiches(prev => prev.filter(f => f.id !== ficheId));
      toast.success('Fiche supprimée');
    } catch {
      toast.error('Erreur de suppression');
    }
  };

  const deleteQcm = async (qcmId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Supprimer ce QCM ?')) return;
    try {
      await qcmApi.delete(qcmId);
      setQcms(prev => prev.filter(q => q.id !== qcmId));
      toast.success('QCM supprimé');
    } catch {
      toast.error('Erreur de suppression');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Chargement du cours...</p>
        </div>
      </div>
    );
  }

  if (!course) return null;

  const hasContent = course.has_content;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/courses')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux cours
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{course.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {course.course_code && (
                <span className="text-gray-500 text-sm">{course.course_code}</span>
              )}
              {course.term && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">{course.term}</span>
              )}
              {hasContent ? (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                  ✓ Contenu extrait
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full">
                  ⏳ Synchronisation en cours...
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={generateFiche}
              disabled={generatingFiche || !hasContent}
              className="btn-primary flex items-center gap-2"
              title={!hasContent ? 'Attendez la fin de la synchronisation' : ''}
            >
              {generatingFiche ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Génération...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Générer une fiche</>
              )}
            </button>
            <button
              onClick={() => setShowQCMModal(true)}
              disabled={!hasContent}
              className="btn-secondary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Créer un QCM
            </button>
          </div>
        </div>
      </div>

      {/* No content warning */}
      {!hasContent && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Extraction du contenu en cours</p>
            <p className="text-sm text-amber-600 mt-0.5">
              Le contenu du cours est en cours d'extraction depuis Canvas. 
              Actualisez la page dans quelques instants.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('fiches')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'fiches'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            Fiches de révision
            {fiches.length > 0 && (
              <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                {fiches.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('qcm')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'qcm'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            QCM
            {qcms.length > 0 && (
              <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                {qcms.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Fiches Tab */}
      {activeTab === 'fiches' && (
        <div className="space-y-4">
          {fiches.length === 0 ? (
            <div className="text-center py-12 card">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Aucune fiche de révision</p>
              <p className="text-gray-400 text-sm mb-4">
                Générez votre première fiche avec l'IA Gemini
              </p>
              <button
                onClick={generateFiche}
                disabled={!hasContent || generatingFiche}
                className="btn-primary"
              >
                <Sparkles className="w-4 h-4 inline mr-2" />
                Générer une fiche
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {fiches.map(fiche => (
                <div
                  key={fiche.id}
                  onClick={() => navigate(`/courses/${courseId}/fiche/${fiche.id}`)}
                  className="card hover:shadow-md transition-shadow cursor-pointer group flex items-start gap-4"
                >
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{fiche.title}</h3>
                    {fiche.summary && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{fiche.summary}</p>
                    )}
                    {fiche.key_concepts && fiche.key_concepts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {fiche.key_concepts.slice(0, 5).map(c => (
                          <span key={c} className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(fiche.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={`http://localhost:8000/api/export/fiche/${fiche.id}`}
                      target="_blank"
                      onClick={e => e.stopPropagation()}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="Télécharger PDF"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={(e) => deleteFiche(fiche.id, e)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QCM Tab */}
      {activeTab === 'qcm' && (
        <div className="space-y-4">
          {qcms.length === 0 ? (
            <div className="text-center py-12 card">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Aucun QCM créé</p>
              <p className="text-gray-400 text-sm mb-4">
                Créez votre premier QCM personnalisé
              </p>
              <button
                onClick={() => setShowQCMModal(true)}
                disabled={!hasContent}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Créer un QCM
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {qcms.map(qcm => (
                <div
                  key={qcm.id}
                  onClick={() => navigate(`/courses/${courseId}/qcm/${qcm.id}`)}
                  className="card hover:shadow-md transition-shadow cursor-pointer group flex items-start gap-4"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{qcm.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-500">{qcm.nb_questions} questions</span>
                      <span className={`badge-${qcm.difficulty}`}>
                        {qcm.difficulty === 'easy' ? 'Facile' : qcm.difficulty === 'medium' ? 'Moyen' : 'Difficile'}
                      </span>
                      {qcm.topic && (
                        <span className="text-sm text-blue-600">{qcm.topic}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(qcm.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={`http://localhost:8000/api/export/qcm/${qcm.id}?include_answers=true`}
                      target="_blank"
                      onClick={e => e.stopPropagation()}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="Télécharger PDF"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={(e) => deleteQcm(qcm.id, e)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QCM Modal */}
      {showQCMModal && course && (
        <QCMGeneratorModal
          course={course}
          fiches={fiches}
          onClose={() => setShowQCMModal(false)}
          onGenerated={(qcm) => {
            setQcms(prev => [qcm, ...prev]);
            setActiveTab('qcm');
            setShowQCMModal(false);
            navigate(`/courses/${courseId}/qcm/${qcm.id}`);
          }}
        />
      )}
    </div>
  );
}
