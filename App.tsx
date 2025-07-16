
import React, { useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import CreatorView from './components/CreatorView';
import GalleryView from './components/GalleryView';

const Toast: React.FC<{ message: string; show: boolean; onDismiss: () => void }> = ({ message, show }) => {
  if (!show) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white py-3 px-6 rounded-lg shadow-lg z-[2100] transition-opacity duration-300 animate-fade-in-out">
      {message}
    </div>
  );
};

export default function App() {
  const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: '', show: false });

  const showToast = useCallback((message: string, duration = 3000) => {
    setToast({ message, show: true });
    setTimeout(() => {
      setToast(t => ({ ...t, show: false }));
    }, duration);
  }, []);

  return (
    <div className="bg-white text-gray-800 min-h-screen">
      <main className="container mx-auto px-4">
        <Routes>
          <Route path="/" element={<CreatorView showToast={showToast} />} />
          <Route path="/:folderId/:clientName" element={<GalleryView showToast={showToast} />} />
        </Routes>
      </main>
      <Toast message={toast.message} show={toast.show} onDismiss={() => setToast({ message: '', show: false })} />
       <style>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translate(-50%, 10px); }
          10% { opacity: 1; transform: translate(-50%, 0); }
          90% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, 10px); }
        }
        .animate-fade-in-out {
          animation: fade-in-out 3s forwards;
        }
      `}</style>
    </div>
  );
}
