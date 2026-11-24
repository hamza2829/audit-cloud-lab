import { MAX_IMAGE_BYTES, dataUrlBytes } from '@shared/validation';

export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Downscales photos to at most 640 px and JPEG so they fit in a Firestore document. */
export async function prepareImage(file: File, maxSide = 640): Promise<string> {
  const raw = await readAsDataUrl(file);
  if (dataUrlBytes(raw) <= MAX_IMAGE_BYTES / 2 || typeof createImageBitmap !== 'function') return raw;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.8, 0.6, 0.4]) {
    const out = canvas.toDataURL('image/jpeg', quality);
    if (dataUrlBytes(out) <= MAX_IMAGE_BYTES) return out;
  }
  return canvas.toDataURL('image/jpeg', 0.3);
}

export function downloadText(filename: string, text: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
