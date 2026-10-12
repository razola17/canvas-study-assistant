import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, RotateCcw, Trophy, CheckCircle, XCircle, Clock } from 'lucide-react';
import { exportApi, type QCMResult } from '../api';

export default function QCMResultPage() {
  const { courseId, qcmId } = useParams<{ courseId: string; qcmId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<QCMResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(`qcm_result_${qcmId}`);
    if (stored) {
      setResult(JSON.parse(stored));
    } else {
      navigate(`/courses/${courseId}`);
    }
  }, [qcmId]);

  if (!result) return null;

  const scoreColor = result.score >= 75 ? 'text-green-600' : result.score >= 50 ? 'text-yellow-600' : 'text-red-600';
  const scoreBg = result.score >= 75 ? 'bg-green-50' : result.score >= 50 ? 'bg-yellow-50' : 'bg-red-50';
  const scoreBorder = result.score >= 75 ? 'border-green-200' : result.score >= 50 ? 'border-yellow-200' : 'border-red-200';

  const formatTime = (s?: number) => {
    if (!s) return '-';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/courses/${courseId}`)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au cours
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/courses/${courseId}/qcm/${qcmId}`)}
            className="btn-secondary flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Recommencer
          </button>
          <a
            href={exportApi.qcmPdf(parseInt(qcmId!), true)}
            target="_blank"
            className="btn-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exporter avec réponses
          </a>
        </div>
      </div>

      {/* Score Card */}
      <div className={`card border-2 ${scoreBorder} ${scoreBg} text-center py-10`}>
        <Trophy className={`w-12 h-12 mx-auto mb-4 ${scoreColor}`} />
        <div className={`text-6xl font-bold mb-2 ${scoreColor}`}>{result.score}%</div>
        <div className="text-2xl font-semibold text-gray-800 mb-1">{result.grade}</div>
        <p className="text-gray-500">
          {result.correct} bonnes réponses sur {result.total}
        </p>
        {result.time_spent && (
          <div className="flex items-center justify-center gap-1.5 mt-3 text-sm text-gray-400">
            <Clock className="w-4 h-4" />
            Temps: {formatTime(result.time_spent)}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{result.correct}</div>
          <div className="text-sm text-gray-500 mt-1">Correctes</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-500">{result.total - result.correct}</div>
          <div className="text-sm text-gray-500 mt-1">Incorrectes</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-700">{result.total}</div>
          <div className="text-sm text-gray-500 mt-1">Total</div>
        </div>
      </div>

      {/* Toggle Details */}
      <div className="text-center">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="btn-secondary"
        >
          {showDetails ? 'Masquer les détails' : 'Voir le corrigé détaillé'}
        </button>
      </div>

      {/* Detailed Results */}
      {showDetails && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Corrigé détaillé</h2>
          {result.results.map((r, i) => (
            <div
              key={r.question_id}
              className={`card border-l-4 ${r.is_correct ? 'border-l-green-500' : 'border-l-red-500'}`}
            >
              <div className="flex items-start gap-3 mb-3">
                {r.is_correct ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    <span className="text-gray-400 mr-2">{i + 1}.</span>
                    {r.question}
                  </p>
                  {r.topic && (
                    <span className="text-xs text-gray-400 mt-0.5">{r.topic}</span>
                  )}
                </div>
              </div>

              <div className="ml-8 space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Votre réponse:</span>
                  <span className={r.is_correct ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                    {r.user_answer || 'Non répondu'}
                  </span>
                </div>
                {!r.is_correct && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Bonne réponse:</span>
                    <span className="text-green-700 font-medium">{r.correct_answer}</span>
                  </div>
                )}
                {r.explanation && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                    💡 {r.explanation}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
