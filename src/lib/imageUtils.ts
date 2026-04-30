
/**
 * Compresses an image from a Base64 string or File.
 * Returns a Base64 string of the compressed JPEG.
 * Under 800px and 70% quality generally results in <100KB.
 */
export const compressImage = (source: string | File, maxWidth = 400, maxHeight = 400): Promise<string> => {
  return new Promise((resolve, reject) => {
    const processImg = (base64Str: string) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Canvas context failed"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // 0.6 quality at 400px usually yields < 30KB
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = reject;
    };

    if (typeof source === 'string') {
      processImg(source);
    } else {
      const reader = new FileReader();
      reader.onloadend = () => processImg(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(source);
    }
  });
};

/**
 * Converts a Base64 string to a Blob for uploading.
 */
export const base64ToBlob = async (base64: string): Promise<Blob> => {
  const response = await fetch(base64);
  return await response.blob();
};
