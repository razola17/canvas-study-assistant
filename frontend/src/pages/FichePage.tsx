import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { fichesApi, exportApi, type Fiche } from '../api';
import toast from 'react-hot-toast';

export default function FichePage() {
  const { courseId, ficheId } = useParams<{ courseId: string; ficheId: string }>();
  const navigate = useNavigate();
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ficheId) loadFiche(parseInt(ficheId));
  }, [ficheId]);

  const loadFiche = async (id: number) => {
    setLoading(true);
    try {
      const res = await fichesApi.get(id);
      setFiche(res.data);
    } catch {
      toast.error('Erreur de chargement de la fiche');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!fiche) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(`/courses/${courseId}`)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au cours
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{fiche.title}</h1>
              <p className="text-sm text-gray-400 mt-1">
                Créée le {new Date(fiche.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
              </p>
            </div>
          </div>
          <a
            href={exportApi.fichePdf(fiche.id)}
            target="_blank"
            className="btn-secondary flex items-center gap-2 flex-shrink-0"
          >
            <Download className="w-4 h-4" />
            Télécharger PDF
          </a>
        </div>
      </div>

      {/* Summary */}
      {fiche.summary && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
            📌 Résumé
          </h3>
          <p className="text-blue-700 text-sm leading-relaxed">{fiche.summary}</p>
        </div>
      )}

      {/* Key Concepts */}
      {fiche.key_concepts && fiche.key_concepts.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            🔑 Concepts clés
          </h3>
          <div className="flex flex-wrap gap-2">
            {fiche.key_concepts.map((concept, i) => (
              <span key={i} className="bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full">
                {concept}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="card">
        <div className="markdown-content prose max-w-none">
          <ReactMarkdown>{fiche.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
