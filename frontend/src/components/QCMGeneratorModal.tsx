import { useState } from 'react';
import { X, Sliders, BookOpen, Sparkles } from 'lucide-react';
import { qcmApi, type Course, type Fiche, type QCM } from '../api';
import toast from 'react-hot-toast';

interface QCMGeneratorModalProps {
  course: Course;
  fiches: Fiche[];
  onClose: () => void;
  onGenerated: (qcm: QCM) => void;
}

export default function QCMGeneratorModal({
  course, fiches, onClose, onGenerated
}: QCMGeneratorModalProps) {
  const [nbQuestions, setNbQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [topic, setTopic] = useState('');
  const [selectedFicheId, setSelectedFicheId] = useState<number | undefined>();
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await qcmApi.generate({
        course_id: course.id,
        fiche_id: selectedFicheId,
        nb_questions: nbQuestions,
        difficulty,
        topic: topic.trim() || undefined,
      });
      toast.success(`QCM de ${res.data.nb_questions} questions généré !`);
      onGenerated(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur de génération du QCM');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Sliders className="w-4 h-4 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Créer un QCM</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Course Info */}
          <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-3">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-800 font-medium">{course.name}</span>
          </div>

          {/* Fiche source */}
          {fiches.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Basé sur une fiche (optionnel)
              </label>
              <select
                value={selectedFicheId || ''}
                onChange={(e) => setSelectedFicheId(e.target.value ? parseInt(e.target.value) : undefined)}
                className="input-field"
              >
                <option value="">Utiliser tout le contenu du cours</option>
                {fiches.map(f => (
                  <option key={f.id} value={f.id}>{f.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Nombre de questions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nombre de questions: <span className="text-blue-600 font-bold">{nbQuestions}</span>
            </label>
            <input
              type="range"
              min={5}
              max={30}
              step={5}
              value={nbQuestions}
              onChange={(e) => setNbQuestions(parseInt(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>20</span>
              <span>25</span>
              <span>30</span>
            </div>
          </div>

          {/* Difficulté */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Difficulté
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'easy', label: '😊 Facile', desc: 'Mémorisation' },
                { value: 'medium', label: '🧠 Moyen', desc: 'Application' },
                { value: 'hard', label: '🔥 Difficile', desc: 'Analyse' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDifficulty(opt.value)}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    difficulty === opt.value
                      ? opt.value === 'easy' ? 'border-green-500 bg-green-50'
                        : opt.value === 'medium' ? 'border-yellow-500 bg-yellow-50'
                        : 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Thème spécifique */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Thème spécifique (optionnel)
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Chapitre 3, Les bases de données..."
              className="input-field"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">
            Annuler
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Génération... ({nbQuestions} questions)
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Générer le QCM
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
