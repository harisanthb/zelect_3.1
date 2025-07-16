
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { DriveFile, Favorite } from '../types';
import { getFiles } from '../services/driveService';
import { isFirebaseConfigured, onFavoritesChange, toggleFavoriteInFirestore } from '../services/firebaseService';
import { HeartIcon, DownloadIcon, Spinner } from './Icons';
import DetailView from './DetailView';

const ITEMS_PER_PAGE = 50;

// Custom hook to manage favorites in Firestore
const useFavorites = (folderId: string | undefined, allItems: DriveFile[]) => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  useEffect(() => {
    if (!folderId || !isFirebaseConfigured) return;
    
    // Set up a real-time listener for favorites
    const unsubscribe = onFavoritesChange(folderId, (newFavorites) => {
      setFavorites(newFavorites);
    });
    
    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, [folderId]);
  
  const isFavorited = useCallback((id: string) => favorites.some(fav => fav.id === id), [favorites]);

  const toggleFavorite = useCallback(async (id: string) => {
    if (!folderId || !isFirebaseConfigured) return;
    const file = allItems.find(f => f.id === id);
    if (!file) return;

    // The update is now atomic in the backend.
    // The local state will be updated automatically by the onSnapshot listener.
    await toggleFavoriteInFirestore(folderId, file);
  }, [folderId, allItems]);

  return { favorites, isFavorited, toggleFavorite };
};


// Gallery Item Component
interface GalleryItemProps {
    file: DriveFile;
    isFavorited: boolean;
    onToggleFavorite: (id: string) => void;
    onClick: () => void;
}
const GalleryItem: React.FC<GalleryItemProps> = React.memo(({ file, isFavorited, onToggleFavorite, onClick }) => {
    const imgRef = useRef<HTMLImageElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const target = entry.target as HTMLImageElement;
                        target.src = target.dataset.src || '';
                        observer.unobserve(target);
                    }
                });
            },
            { rootMargin: "200px" }
        );

        const currentImgRef = imgRef.current;
        if (currentImgRef) {
            observer.observe(currentImgRef);
        }

        return () => {
            if (currentImgRef) {
                observer.unobserve(currentImgRef);
            }
        };
    }, []);

    return (
        <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group cursor-pointer" onClick={onClick}>
            <img
                ref={imgRef}
                alt={file.name}
                data-src={file.thumbnailLink.replace(/=s\d+/, '=s600')}
                className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setIsLoaded(true)}
            />
            {!isLoaded && <div className="absolute inset-0 bg-gray-100"></div>}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(file.id);
                }}
                className={`absolute top-2 right-2 bg-white/70 backdrop-blur-sm rounded-full w-9 h-9 flex items-center justify-center z-10 hover:bg-white transition-transform duration-200 group-hover:scale-110 ${isFavorited ? 'text-red-500' : 'text-gray-600'}`}
            >
                <HeartIcon className={`w-5 h-5 transition-colors ${isFavorited ? 'fill-red-500' : 'fill-transparent'}`} />
            </button>
        </div>
    );
});

// Main Gallery View Component
const GalleryView: React.FC<{ showToast: (message: string) => void; }> = ({ showToast }) => {
  const { folderId, clientName } = useParams<{ folderId: string; clientName: string }>();
  const [allItems, setAllItems] = useState<DriveFile[]>([]);
  const { favorites, isFavorited, toggleFavorite } = useFavorites(folderId, allItems);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavoritesView, setIsFavoritesView] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [detailViewIndex, setDetailViewIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchGalleryData = async () => {
      if (!folderId) return;
      setIsLoading(true);
      setError(null);
      try {
        const files = await getFiles(folderId);
        setAllItems(files);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchGalleryData();
  }, [folderId]);

  const filteredItems = useMemo(() => {
    return isFavoritesView ? allItems.filter(item => isFavorited(item.id)) : allItems;
  }, [isFavoritesView, allItems, isFavorited]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const visibleItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage, filteredItems]);

  const exportFavorites = () => {
    if (favorites.length === 0) {
      showToast("No favorites to export.");
      return;
    }
    const decodedClientName = decodeURIComponent(clientName || 'selection');
    const fileNames = favorites.map(fav => fav.name).join('\n');
    const blob = new Blob([fileNames], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `favorites_${decodedClientName}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Favorites list exported.");
  };

  const handleOpenDetailView = (itemIndex: number) => {
    const globalIndex = filteredItems.findIndex(item => item.id === visibleItems[itemIndex].id);
    setDetailViewIndex(globalIndex);
  };
  
  if (isLoading) {
    return <div className="flex flex-col items-center justify-center min-h-[80vh]"><Spinner /><p className="mt-4 text-gray-500">Loading Gallery...</p></div>;
  }

  if (error) {
    return <div className="text-center py-20"><p className="text-red-600">Error: {error}</p></div>;
  }
  
  return (
    <>
      {!isFirebaseConfigured && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 my-6 rounded-md shadow" role="alert">
          <p className="font-bold">Configuration Required</p>
          <p>The shared selection feature is disabled. To enable real-time sharing of favorites, please configure your Firebase project details in the <code>firebaseConfig.ts</code> file.</p>
        </div>
      )}
      <header className="py-8 text-center">
        <h1 className="text-xl font-bold tracking-tighter sm:text-2xl">ZELECT</h1>
        <p className="text-xs text-gray-400 tracking-[0.2em] mt-1">BY IBA FILMS</p>
      </header>
      <div className="sticky top-0 bg-white/80 backdrop-blur-md z-20 py-4 mb-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
              <div>
                  <h2 className="text-2xl font-bold">{decodeURIComponent(clientName || '')}</h2>
                  <p className="text-sm text-gray-500 mt-1">{allItems.length} items ・ {favorites.length} selected</p>
              </div>
              <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsFavoritesView(v => !v)} 
                    className={`p-3 rounded-full transition-colors ${isFavoritesView ? 'bg-red-100 text-red-500' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
                    disabled={!isFirebaseConfigured}
                    title={isFirebaseConfigured ? "Show Favorites" : "Favorites feature disabled. Please configure Firebase."}
                  >
                      <HeartIcon className={`w-6 h-6 ${isFavoritesView ? 'fill-red-500' : 'fill-transparent'}`} />
                  </button>
                  <button onClick={exportFavorites} className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors" title="Export favorites list">
                      <DownloadIcon className="w-6 h-6" />
                  </button>
              </div>
          </div>
      </div>
      
      {filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
              {visibleItems.map((file, index) => (
                  <GalleryItem
                      key={file.id}
                      file={file}
                      isFavorited={isFavorited(file.id)}
                      onToggleFavorite={toggleFavorite}
                      onClick={() => handleOpenDetailView(index)}
                  />
              ))}
          </div>
      ) : (
          <p className="text-center text-gray-500 py-20">{isFavoritesView ? "You haven't selected any favorites yet." : "No media found in this folder."}</p>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 py-12">
            <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="px-6 py-2 bg-gray-800 text-white rounded-lg disabled:bg-gray-300">Previous</button>
            <span>Page {currentPage} of {totalPages}</span>
            <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="px-6 py-2 bg-gray-800 text-white rounded-lg disabled:bg-gray-300">Next</button>
        </div>
      )}
      
      {detailViewIndex !== null && (
        <DetailView
          items={filteredItems}
          startIndex={detailViewIndex}
          onClose={() => setDetailViewIndex(null)}
          isFavorited={isFavorited}
          onToggleFavorite={toggleFavorite}
          showToast={showToast}
        />
      )}
    </>
  );
};

export default GalleryView;