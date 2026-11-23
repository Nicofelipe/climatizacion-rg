/** Lo que se estaba registrando al abrir la cámara o las fotos. */
export interface PendingForm {
  userId: number; companyId: number; editId?: number;
  /** Se abrió la cámara (no la galería). */
  camera: boolean;
  at: number;
  fields: Record<string, unknown>; touched: string[];
}
const MAX_AGE_MS = 30 * 60 * 1000;

/** Solo sirve para la misma persona y empresa, y por poco tiempo. */
export function validPending(json: string, userId: number, companyId: number, now = Date.now()): PendingForm | null {
  try {
    const value = JSON.parse(json);
    if (!value || value.userId !== userId || value.companyId !== companyId) return null;
    if (typeof value.at !== 'number' || now - value.at > MAX_AGE_MS || value.at > now + 60000) return null;
    if (value.editId !== undefined && (!Number.isSafeInteger(value.editId) || value.editId <= 0)) return null;
    if (!value.fields || typeof value.fields !== 'object' || !Array.isArray(value.touched)) return null;
    return { userId, companyId, editId: value.editId, camera: value.camera === true, at: value.at, fields: value.fields, touched: value.touched.filter((item: unknown) => typeof item === 'string') };
  } catch { return null; }
}
