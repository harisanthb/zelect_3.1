
import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface CreatorViewProps {
  showToast: (message: string) => void;
}

const CreatorView: React.FC<CreatorViewProps> = ({ showToast }) => {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState('');
  const [folderLink, setFolderLink] = useState('');
  const [galleryLink, setGalleryLink] = useState('');
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (navigator.share) {
      setCanShare(true);
    }
  }, []);

  const handleGenerateLink = (e: FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !folderLink.trim()) {
      showToast('Please fill out both fields.');
      return;
    }

    const folderIdMatch = folderLink.match(/folders\/([a-zA-Z0-9_-]+)/);
    if (!folderIdMatch || !folderIdMatch[1]) {
      showToast('Please enter a valid Google Drive folder link.');
      return;
    }
    const folderId = folderIdMatch[1];
    const url = new URL(window.location.href);
    url.hash = `/${folderId}/${encodeURIComponent(clientName)}`;
    setGalleryLink(url.href);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(galleryLink);
      showToast('Link copied to clipboard!');
    } catch (err) {
      showToast('Failed to copy link.');
    }
  };
  
  const shareLink = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: `ZELECT Gallery for ${clientName}`,
        text: `Here is the link to your photo selection gallery.`,
        url: galleryLink,
      });
    } catch (err) {
      // Ignore abort errors
    }
  };

  const openLink = () => {
    window.open(galleryLink, '_blank', 'noopener,noreferrer');
    navigate(0); // Refresh the page to potentially clear state or re-route.
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
      <header className="mb-8">
        <h1 className="text-5xl font-bold tracking-tighter">ZELECT</h1>
        <p className="text-xs text-gray-500 tracking-[0.2em] mt-1">BY IBA FILMS</p>
      </header>
      <div className="w-full max-w-md p-8 bg-white border border-gray-200 rounded-2xl shadow-sm">
        <form onSubmit={handleGenerateLink}>
          <div className="mb-6 text-left">
            <label htmlFor="clientName" className="block text-sm font-medium text-gray-600 mb-2">Client Name</label>
            <input
              type="text"
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Enter client's name"
              required
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 transition"
            />
          </div>
          <div className="mb-6 text-left">
            <label htmlFor="folderLink" className="block text-sm font-medium text-gray-600 mb-2">Google Drive Folder Link</label>
            <input
              type="text"
              id="folderLink"
              value={folderLink}
              onChange={(e) => setFolderLink(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              required
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 transition"
            />
          </div>
          <button type="submit" className="w-full bg-black text-white font-semibold py-3 px-5 rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-300">
            Generate Link
          </button>
        </form>
        {galleryLink && (
          <div className="mt-8 text-left">
            <label htmlFor="galleryLink" className="block text-sm font-medium text-gray-600 mb-2">Sharable Link</label>
            <input
              id="galleryLink"
              type="text"
              readOnly
              value={galleryLink}
              className="w-full px-4 py-3 text-base bg-gray-100 border border-gray-300 rounded-lg mb-4"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button onClick={copyLink} className="sm:col-span-1 bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors">Copy</button>
                {canShare && <button onClick={shareLink} className="sm:col-span-1 bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors">Share</button>}
                <button onClick={openLink} className="col-span-2 sm:col-span-1 bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors">Open</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorView;
