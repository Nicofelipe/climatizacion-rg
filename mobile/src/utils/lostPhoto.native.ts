import { Directory, File, Paths } from 'expo-file-system';

/** La cámara guarda la foto en esta carpeta antes de devolver el control a la app. */
const FOLDER = 'ImagePicker';
const MIN_BYTES = 10 * 1024;

/** Foto más reciente tomada después de `since` y que no llegó a la app porque Android la cerró. */
export function newestCapture(since: number): { uri: string; mimeType: string } | null {
  try {
    const folder = new Directory(Paths.cache, FOLDER);
    if (!folder.exists) return null;
    let newest: { uri: string; time: number } | null = null;
    for (const item of folder.list()) {
      if (!(item instanceof File) || !/\.jpe?g$/i.test(item.uri) || (item.size ?? 0) < MIN_BYTES) continue;
      const time = item.modificationTime ?? 0;
      if (time >= since - 2000 && (!newest || time > newest.time)) newest = { uri: item.uri, time };
    }
    return newest ? { uri: newest.uri, mimeType: 'image/jpeg' } : null;
  } catch { return null; }
}
