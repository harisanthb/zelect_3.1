import * as firebaseApp from 'firebase/app';
import { getFirestore, doc, onSnapshot, runTransaction, Firestore } from 'firebase/firestore';
import { firebaseConfig } from '../firebaseConfig';
import { DriveFile, Favorite } from '../types';

let app: firebaseApp.FirebaseApp;
let db: Firestore;
export let isFirebaseConfigured = false;

// Initialize Firebase
try {
  // Check if any of the config values are placeholders. This is a developer-friendly check.
  if (Object.values(firebaseConfig).some(value => value.includes('YOUR_'))) {
    throw new Error("Firebase is not configured. Please update firebaseConfig.ts with your project details.");
  }

  if (!firebaseApp.getApps().length) {
    app = firebaseApp.initializeApp(firebaseConfig);
  } else {
    app = firebaseApp.getApps()[0];
  }
  db = getFirestore(app);
  isFirebaseConfigured = true;
} catch (error) {
  // Log the error for the developer but don't crash the app.
  // The UI will show a warning based on the 'isFirebaseConfigured' flag.
  console.warn(error);
}

const galleriesCollection = 'galleries';

/**
 * Sets up a real-time listener for changes to a gallery's favorites.
 * @param folderId The ID of the Google Drive folder, used as the document ID.
 * @param callback The function to call with the updated list of favorites.
 * @returns An unsubscribe function to detach the listener.
 */
export const onFavoritesChange = (
  folderId: string, 
  callback: (favorites: Favorite[]) => void
) => {
  if (!db) {
    return () => {}; // Return a no-op unsubscribe function
  }
  const docRef = doc(db, galleriesCollection, folderId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      // Assuming the document structure is { favorites: Favorite[] }
      const data = docSnap.data();
      callback(data.favorites || []);
    } else {
      // If the document doesn't exist yet, treat favorites as an empty array.
      callback([]);
    }
  }, (error) => {
    console.error("Error listening to favorites changes:", error);
  });
};

/**
 * Toggles a file's favorite status in Firestore using a transaction for safety.
 * This prevents race conditions in shared galleries.
 * @param folderId The ID of the Google Drive folder.
 * @param file The file to toggle.
 */
export const toggleFavoriteInFirestore = async (
  folderId: string,
  file: DriveFile
) => {
  if (!db) {
    return;
  }
  const docRef = doc(db, galleriesCollection, folderId);
  
  try {
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      const currentFavorites: Favorite[] = docSnap.exists() ? docSnap.data().favorites || [] : [];
      
      const isCurrentlyFavorite = currentFavorites.some(fav => fav.id === file.id);
      
      const newFavorites = isCurrentlyFavorite
        ? currentFavorites.filter(fav => fav.id !== file.id)
        : [...currentFavorites, { id: file.id, name: file.name }];

      // Using .set() will create the doc if it doesn't exist, or overwrite the specified field.
      transaction.set(docRef, { favorites: newFavorites });
    });
  } catch (error) {
    console.error("Error updating favorites in Firestore transaction:", error);
  }
};