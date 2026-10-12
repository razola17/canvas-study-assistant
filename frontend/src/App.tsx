import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { canvasApi } from './api';
import Layout from './components/Layout';
import SetupPage from './pages/SetupPage';
import CoursesPage from './pages/CoursesPage';
import CoursePage from './pages/CoursePage';
import FichePage from './pages/FichePage';
import QCMPage from './pages/QCMPage';
import QCMResultPage from './pages/QCMResultPage';

function App() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const res = await canvasApi.getStatus();
      setIsConnected(res.data.connected);
    } catch {
      setIsConnected(false);
    }
  };

  if (isConnected === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { borderRadius: '10px', background: '#333', color: '#fff' },
          success: { style: { background: '#059669' } },
          error: { style: { background: '#dc2626' } },
        }}
      />
      <Routes>
        <Route
          path="/setup"
          element={<SetupPage onConnected={() => setIsConnected(true)} />}
        />
        {!isConnected ? (
          <Route path="*" element={<Navigate to="/setup" replace />} />
        ) : (
          <Route path="/" element={<Layout onDisconnect={() => setIsConnected(false)} />}>
            <Route index element={<Navigate to="/courses" replace />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="courses/:courseId" element={<CoursePage />} />
            <Route path="courses/:courseId/fiche/:ficheId" element={<FichePage />} />
            <Route path="courses/:courseId/qcm/:qcmId" element={<QCMPage />} />
            <Route path="courses/:courseId/qcm/:qcmId/result" element={<QCMResultPage />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
