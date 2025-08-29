// Image compression and optimization utilities for better performance

/**
 * Compresses an image file to reduce size and improve performance
 * @param file - The original image file
 * @param maxWidth - Maximum width for the compressed image (default: 1200)
 * @param quality - Compression quality 0-1 (default: 0.8)
 * @returns Promise<string> - Base64 data URL of compressed image
 */
export function compressImage(file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        const newWidth = img.width * ratio;
        const newHeight = img.height * ratio;
        
        // Set canvas dimensions
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Draw and compress image
        ctx?.drawImage(img, 0, 0, newWidth, newHeight);
        
        // Convert to base64 with compression
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Checks if sessionStorage has enough space for an image
 * @param dataUrl - Base64 data URL to check
 * @returns boolean - True if storage has space
 */
export function checkStorageSpace(dataUrl: string): boolean {
  try {
    const testKey = 'storage-test';
    sessionStorage.setItem(testKey, dataUrl);
    sessionStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.warn('SessionStorage space check failed:', error);
    return false;
  }
}

/**
 * Safely stores image data with fallback compression if needed
 * @param key - Storage key
 * @param dataUrl - Base64 data URL
 * @param file - Original file for recompression if needed
 */
export async function safeStoreImage(key: string, dataUrl: string, file?: File): Promise<void> {
  try {
    // Try storing original
    if (checkStorageSpace(dataUrl)) {
      sessionStorage.setItem(key, dataUrl);
      return;
    }
    
    // If storage full and we have original file, try with more compression
    if (file) {
      console.log('Storage full, recompressing image...');
      const compressedUrl = await compressImage(file, 800, 0.6); // More aggressive compression
      
      if (checkStorageSpace(compressedUrl)) {
        sessionStorage.setItem(key, compressedUrl);
        return;
      }
    }
    
    console.warn('Unable to store image - storage quota exceeded');
  } catch (error) {
    console.error('Error storing image:', error);
  }
}

/**
 * Cleans up old image data from sessionStorage to free space
 */
export function cleanupOldImages(): void {
  try {
    const keys = Object.keys(sessionStorage);
    const imageKeys = keys.filter(key => 
      key.includes('Image') || key.includes('Result') || key.includes('Url')
    );
    
    // Remove oldest entries if we have more than 5 image-related items
    if (imageKeys.length > 5) {
      const keysToRemove = imageKeys.slice(0, imageKeys.length - 5);
      keysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
      });
      console.log(`Cleaned up ${keysToRemove.length} old image entries`);
    }
  } catch (error) {
    console.error('Error cleaning up images:', error);
  }
}