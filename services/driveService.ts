import { DriveFile } from '../types';
import { GOOGLE_DRIVE_API_KEY } from '../config';

const API_KEY = GOOGLE_DRIVE_API_KEY;

export const getFiles = async (folderId: string): Promise<DriveFile[]> => {
  if (!API_KEY || API_KEY.startsWith("YOUR_")) {
    throw new Error("API key is not configured. Please set the GOOGLE_DRIVE_API_KEY in config.ts.");
  }

  const query = `'${folderId}' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed = false`;
  const fields = 'nextPageToken, files(id,name,thumbnailLink,mimeType)';
  const pageSize = 1000;
  const orderBy = 'createdTime';
  
  const baseUrl = 'https://www.googleapis.com/drive/v3/files';
  let allFiles: DriveFile[] = [];
  let pageToken: string | undefined = undefined;

  try {
    do {
      const params = new URLSearchParams({
        q: query,
        key: API_KEY,
        fields: fields,
        pageSize: pageSize.toString(),
        orderBy: orderBy,
      });

      if (pageToken) {
        params.append('pageToken', pageToken);
      }
      
      const url = `${baseUrl}?${params.toString()}`;

      const response = await fetch(url);
      if (!response.ok) {
        let errorMsg = `Error fetching files: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error?.message || errorMsg;
        } catch (e) {
          // Ignore if response is not JSON
        }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      if (data.files) {
        allFiles = allFiles.concat(data.files);
      }
      pageToken = data.nextPageToken;

    } while (pageToken);

    return allFiles;
  } catch (error) {
    console.error("Google Drive API call failed:", error);
    throw error;
  }
};
