import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, ExternalLink, CheckCircle, Server, ChevronDown, ChevronUp } from 'lucide-react';
import { canvasApi } from '../api';
import toast from 'react-hot-toast';

interface SetupPageProps {
  onConnected: () => void;
}

export default function SetupPage({ onConnected }: SetupPageProps) {
  const [domain, setDomain] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('CANVAS_API_BASE_URL') || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain || !token) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (apiUrl.trim()) {
      localStorage.setItem('CANVAS_API_BASE_URL', apiUrl.trim().replace(/\/$/, ''));
    } else {
      localStorage.removeItem('CANVAS_API_BASE_URL');
    }

    setLoading(true);
    try {
      // Nettoyer le domaine (retirer https:// si présent)
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const res = await canvasApi.configure(cleanDomain, token);
      toast.success(res.data?.message || 'Connexion réussie !');
      onConnected();
      navigate('/courses');
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Erreur de connexion';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Canvas Study</h1>
          <p className="text-gray-500 mt-2">
            Connectez votre compte Canvas pour commencer
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleConnect} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Domaine Canvas
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="myschool.instructure.com"
                className="input-field"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Le domaine de votre institution (ex: université.instructure.com)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Token d'accès Canvas
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Votre token d'accès personnel"
                  className="input-field pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <a
                href="#"
                className="text-xs text-blue-600 hover:underline mt-1 flex items-center gap-1"
                onClick={(e) => {
                  e.preventDefault();
                  const d = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
                  if (d) window.open(`https://${d}/profile/settings#access_tokens_holder`, '_blank');
                  else toast.error('Entrez d\'abord votre domaine Canvas');
                }}
              >
                <ExternalLink className="w-3 h-3" />
                Générer un token dans Canvas
              </a>
            </div>

            {/* Paramètres avancés API */}
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between text-xs font-medium text-gray-500 hover:text-gray-700"
              >
                <span className="flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5" />
                  Paramètres avancés (Serveur API)
                </span>
                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showAdvanced && (
                <div className="mt-2.5 pt-2 border-t border-gray-200">
                  <label className="block text-xs text-gray-600 mb-1">
                    Adresse du serveur Backend API (optionnel)
                  </label>
                  <input
                    type="text"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="ex: https://canvas-study-api-xyz.a.run.app/api"
                    className="input-field text-xs py-1.5"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Laissez vide pour utiliser l'URL par défaut du domaine en ligne.
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Se connecter
                </>
              )}
            </button>
          </form>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">Comment obtenir votre token ?</h3>
            <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
              <li>Connectez-vous à Canvas</li>
              <li>Allez dans Compte → Paramètres</li>
              <li>Faites défiler jusqu'à "Tokens d'accès approuvés"</li>
              <li>Cliquez sur "+ Nouveau token d'accès"</li>
              <li>Copiez le token généré ici</li>
            </ol>
          </div>
        </div>

        {/* Features */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { icon: '📚', text: 'Extraction automatique' },
            { icon: '📝', text: 'Fiches de révision' },
            { icon: '✅', text: 'QCM intelligents' },
          ].map((f) => (
            <div key={f.text} className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
              <div className="text-2xl mb-1">{f.icon}</div>
              <div className="text-xs text-gray-600 font-medium">{f.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
