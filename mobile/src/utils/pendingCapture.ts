import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { newestCapture } from './lostPhoto';
import { PendingForm, validPending } from './pendingCaptureRules';

/*
 * Android puede cerrar la app mientras la cámara o las fotos están abiertas (poca memoria). Antes de abrirlas se
 * anota qué se estaba registrando; al volver se recupera lo escrito y, si se puede, la foto. Se borra apenas deja
 * de hacer falta.
 */
export interface RecoveredCapture { photo: { uri: string; mimeType?: string | null } | null; form: PendingForm }

const KEY = 'clepit.capture.v1';
let recovered: RecoveredCapture | null = null;

export async function rememberCapture(form: Omit<PendingForm, 'at'>) {
  if (Platform.OS === 'android') await AsyncStorage.setItem(KEY, JSON.stringify({ ...form, at: Date.now() })).catch(() => {});
}
export async function forgetCapture() {
  if (Platform.OS === 'android') await AsyncStorage.removeItem(KEY).catch(() => {});
}

/** Se llama una vez al iniciar. Devuelve el formulario que hay que reabrir, si la app se cerró a mitad de camino. */
export async function recoverCapture(userId: number, companyId: number): Promise<PendingForm | null> {
  if (Platform.OS !== 'android') return null;
  try {
    const saved = await AsyncStorage.getItem(KEY);
    if (!saved) return null;
    await forgetCapture();
    const form = validPending(saved, userId, companyId);
    if (!form) return null;
    const result = await ImagePicker.getPendingResultAsync().catch(() => null);
    const asset = result && 'assets' in result && !result.canceled ? result.assets?.[0] : null;
    recovered = { photo: asset ? { uri: asset.uri, mimeType: asset.mimeType } : form.camera ? newestCapture(form.at) : null, form };
    return form;
  } catch { return null; }
}

/** El formulario la toma una sola vez, y solo si es la misma boleta. */
export function takeRecoveredCapture(editId?: number): RecoveredCapture | null {
  if (!recovered || recovered.form.editId !== editId) return null;
  const value = recovered;
  recovered = null;
  return value;
}
