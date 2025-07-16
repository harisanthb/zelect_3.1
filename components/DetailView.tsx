
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DriveFile } from '../types';
import { BackIcon, PrevIcon, NextIcon, HeartIcon, DownloadIcon, Spinner } from './Icons';

interface DetailViewProps {
  items: DriveFile[];
  startIndex: number;
  onClose: () => void;
  isFavorited: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  showToast: (message: string) => void;
}

const DetailView: React.FC<DetailViewProps> = ({ items, startIndex, onClose, isFavorited, onToggleFavorite, showToast }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const currentItem = items[currentIndex];

  const handlePrev = useCallback(() => {
    setCurrentIndex(i => (i > 0 ? i - 1 : items.length - 1));
  }, [items.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex(i => (i < items.length - 1 ? i + 1 : 0));
  }, [items.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === ' ') {
        e.preventDefault();
        onToggleFavorite(items[currentIndex].id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, handleNext, handlePrev, items, onClose, onToggleFavorite]);
  
  useEffect(() => {
    setIsMediaLoading(true);
    // Preload next and previous images
    const nextIndex = (currentIndex + 1) % items.length;
    const prevIndex = (currentIndex - 1 + items.length) % items.length;
    [nextIndex, prevIndex].forEach(index => {
        const item = items[index];
        if (item && item.mimeType.startsWith('image/')) {
            const img = new Image();
            img.src = item.thumbnailLink.replace(/=s\d+/, '=s2048');
        }
    });
  }, [currentIndex, items]);

  const downloadFile = (fileId: string) => {
    showToast("Preparing download...");
    const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
    window.open(url, '_blank');
  };

  if (!currentItem) return null;
  const isVideo = currentItem.mimeType.includes('video');
  const highResUrl = isVideo ? `https://drive.google.com/uc?export=view&id=${currentItem.id}` : currentItem.thumbnailLink.replace(/=s\d+/, '=s2048');

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col animate-fade-in">
        <style>{`
            @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
            .animate-fade-in { animation: fade-in 0.2s ease-out; }
            #thumbnail-strip::-webkit-scrollbar { height: 8px; }
            #thumbnail-strip::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        `}</style>
      <header className="absolute top-0 left-0 right-0 z-10 p-3 bg-gradient-to-b from-black/20 to-transparent">
        <button onClick={onClose} className="p-2 text-white rounded-full bg-black/30 hover:bg-black/50">
          <BackIcon className="w-6 h-6" />
        </button>
      </header>
      
      <div className="flex-grow flex items-center justify-center relative bg-black">
        {isMediaLoading && (
            <div className="absolute z-0"><Spinner /></div>
        )}
        {isVideo ? (
            <video 
                key={currentItem.id} 
                src={highResUrl} 
                controls autoPlay 
                onLoadedData={() => setIsMediaLoading(false)}
                className={`max-w-full max-h-full transition-opacity duration-300 ${isMediaLoading ? 'opacity-0' : 'opacity-100'}`}
            />
        ) : (
            <img 
                key={currentItem.id} 
                src={highResUrl} 
                alt={currentItem.name} 
                onLoad={() => setIsMediaLoading(false)}
                className={`max-w-full max-h-full transition-opacity duration-300 ${isMediaLoading ? 'opacity-0' : 'opacity-100'}`}
            />
        )}
        
        <button onClick={handlePrev} className="absolute left-4 p-2 text-white rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm">
          <PrevIcon className="w-8 h-8" />
        </button>
        <button onClick={handleNext} className="absolute right-4 p-2 text-white rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm">
          <NextIcon className="w-8 h-8" />
        </button>
      </div>

      <footer className="flex-shrink-0 bg-white border-t z-10">
        <div className="flex justify-between items-center p-3">
          <h4 className="font-semibold truncate pr-4">{currentItem.name}</h4>
          <div className="flex items-center gap-3">
            <button onClick={() => onToggleFavorite(currentItem.id)} className={`p-2 rounded-full ${isFavorited(currentItem.id) ? 'text-red-500' : 'text-gray-500'}`}>
              <HeartIcon className={`w-6 h-6 ${isFavorited(currentItem.id) ? 'fill-red-500' : ''}`} />
            </button>
            <button onClick={() => downloadFile(currentItem.id)} className="p-2 text-gray-500 rounded-full">
              <DownloadIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div id="thumbnail-strip" className="flex gap-2 p-2 overflow-x-auto bg-gray-100">
          {items.map((item, index) => (
            <Thumbnail key={item.id} item={item} isActive={index === currentIndex} onClick={() => setCurrentIndex(index)} />
          ))}
        </div>
      </footer>
    </div>
  );
};

interface ThumbnailProps {
    item: DriveFile;
    isActive: boolean;
    onClick: () => void;
}
const Thumbnail: React.FC<ThumbnailProps> = ({ item, isActive, onClick }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (isActive) {
            ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [isActive]);

    return (
        <div ref={ref} onClick={onClick} className={`flex-shrink-0 w-16 h-16 rounded-md cursor-pointer border-2 overflow-hidden ${isActive ? 'border-gray-800' : 'border-transparent'}`}>
            <img src={item.thumbnailLink.replace(/=s\d+/, '=s120')} alt={item.name} className="w-full h-full object-cover"/>
        </div>
    );
};

export default DetailView;
