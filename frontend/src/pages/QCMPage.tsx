import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Download, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { qcmApi, exportApi, type QCM } from '../api';
import toast from 'react-hot-toast';

export default function QCMPage() {
  const { courseId, qcmId } = useParams<{ courseId: string; qcmId: string }>();
  const navigate = useNavigate();
  
  const [qcm, setQcm] = useState<QCM | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startTime = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (qcmId) loadQcm(parseInt(qcmId));
    return () => clearInterval(timerRef.current);
  }, [qcmId]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const loadQcm = async (id: number) => {
    setLoading(true);
    try {
      const res = await qcmApi.get(id);
      setQcm(res.data);
    } catch {
      toast.error('Erreur de chargement du QCM');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, label: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: label }));
  };

  const handleSubmit = async () => {
    if (!qcm) return;
    
    const answered = Object.keys(answers).length;
    if (answered < qcm.nb_questions) {
      const unanswered = qcm.nb_questions - answered;
      if (!confirm(`Il vous reste ${unanswered} question(s) sans réponse. Soumettre quand même ?`)) return;
    }

    setSubmitting(true);
    clearInterval(timerRef.current);
    
    try {
      const timeSpent = Math.floor((Date.now() - startTime.current) / 1000);
      const res = await qcmApi.submit(qcm.id, answers, timeSpent);
      // Stocker le résultat dans sessionStorage pour la page de résultat
      sessionStorage.setItem(`qcm_result_${qcm.id}`, JSON.stringify(res.data));
      navigate(`/courses/${courseId}/qcm/${qcmId}/result`);
    } catch {
      toast.error('Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!qcm) return null;

  const question = qcm.questions[currentQ];
  const questionId = String(question.id);
  const userAnswer = answers[questionId];
  const isLast = currentQ === qcm.questions.length - 1;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/courses/${courseId}`)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quitter le QCM
        </button>
        <div className="flex items-center gap-4">
          {/* Timer */}
          <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-lg">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="font-mono text-sm font-medium text-gray-700">{formatTime(elapsed)}</span>
          </div>
          {/* Download */}
          <a
            href={exportApi.qcmPdf(qcm.id, false)}
            target="_blank"
            className="btn-secondary flex items-center gap-2 py-1.5 text-sm"
          >
            <Download className="w-3.5 h-3.5" />
            PDF
          </a>
        </div>
      </div>

      {/* Title & Meta */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">{qcm.title}</h1>
        <div className="flex items-center gap-3 mt-1">
          <span className={`badge-${qcm.difficulty}`}>
            {qcm.difficulty === 'easy' ? 'Facile' : qcm.difficulty === 'medium' ? 'Moyen' : 'Difficile'}
          </span>
          <span className="text-sm text-gray-500">{qcm.nb_questions} questions</span>
          {qcm.topic && <span className="text-sm text-blue-600">• {qcm.topic}</span>}
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Question {currentQ + 1} / {qcm.nb_questions}</span>
          <span>{Object.keys(answers).length} répondues</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQ + 1) / qcm.nb_questions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 leading-relaxed">
          <span className="text-blue-600 font-bold mr-2">{currentQ + 1}.</span>
          {question.question}
        </h2>

        <div className="space-y-3">
          {question.options.map((option) => (
            <button
              key={option.label}
              onClick={() => handleAnswer(questionId, option.label)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-150 flex items-center gap-3 ${
                userAnswer === option.label
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold flex-shrink-0 ${
                userAnswer === option.label
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {option.label}
              </span>
              <span className="text-sm">{option.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Question Navigation */}
      <div className="flex flex-wrap gap-2 justify-center">
        {qcm.questions.map((_, i) => {
          const qId = String(qcm.questions[i].id);
          const isAnswered = answers[qId];
          return (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                i === currentQ
                  ? 'bg-blue-600 text-white'
                  : isAnswered
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
          disabled={currentQ === 0}
          className="btn-secondary flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Précédent
        </button>

        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary flex items-center gap-2 px-6"
          >
            {submitting ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Soumission...</>
            ) : (
              <><Send className="w-4 h-4" /> Soumettre le QCM</>
            )}
          </button>
        ) : (
          <button
            onClick={() => setCurrentQ(prev => Math.min(qcm.questions.length - 1, prev + 1))}
            className="btn-primary flex items-center gap-2"
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Submit from anywhere */}
      {!isLast && Object.keys(answers).length > 0 && (
        <div className="text-center">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="text-sm text-gray-500 hover:text-blue-600 underline transition-colors"
          >
            Soumettre maintenant ({Object.keys(answers).length}/{qcm.nb_questions} répondues)
          </button>
        </div>
      )}
    </div>
  );
}
