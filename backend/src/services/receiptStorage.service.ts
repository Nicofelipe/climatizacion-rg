import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { FileProvider } from './file.service';
import { deleteGoogleDriveFile, getGoogleDriveClient, moveExpenseFileInGoogleDrive, uploadExpenseFileToGoogleDrive } from './googleDrive.service';

/**
 * Respaldo de las fotos. Google Drive es el destino normal; LOCAL guarda en una carpeta privada del servidor
 * y sirve para desarrollo, pruebas o una empresa sin Drive (RECEIPT_STORAGE=local).
 * Cada archivo recuerda su proveedor, de modo que cambiar la opción no afecta las fotos existentes.
 */
export function storageProvider(): FileProvider {
  return process.env.RECEIPT_STORAGE === 'local' ? 'LOCAL' : 'GOOGLE_DRIVE';
}
const localRoot = () => path.resolve(process.env.RECEIPT_STORAGE_DIR ?? 'receipts');

/** El identificador guardado nunca puede salir de la carpeta de su empresa. */
function localPath(companyId: number, fileId: string) {
  if (!/^[\w-]+\.[a-z]{3,4}$/.test(fileId)) throw new Error('LOCAL_FILE_INVALID');
  return path.join(localRoot(), String(companyId), fileId);
}

export async function hashFile(file: string) {
  const hash = createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}

export async function storeReceipt(input: {
  companyId: number; expenseId: number; receiptNumber: string; expenseDate: string;
  localFilePath: string; fileName: string; mimeType: string;
}): Promise<{ provider: FileProvider; id: string }> {
  if (storageProvider() === 'GOOGLE_DRIVE') {
    const file = await uploadExpenseFileToGoogleDrive(input);
    return { provider: 'GOOGLE_DRIVE', id: file.id };
  }
  const id = `${input.expenseId}-${randomUUID()}${path.extname(input.fileName).toLowerCase() || '.jpg'}`;
  const target = localPath(input.companyId, id);
  await fs.promises.mkdir(path.dirname(target), { recursive: true });
  await fs.promises.copyFile(input.localFilePath, target);
  return { provider: 'LOCAL', id };
}

export async function deleteStoredReceipt(companyId: number, provider: FileProvider, id: string) {
  if (provider === 'GOOGLE_DRIVE') await deleteGoogleDriveFile(companyId, id);
  else await fs.promises.rm(localPath(companyId, id), { force: true });
}

/** Ajusta carpeta y nombre a la fecha y número actuales. En LOCAL no hay carpetas por mes. */
export async function relocateStoredReceipt(input: { companyId: number; expenseId: number; provider: FileProvider; fileId: string; expenseDate: string }) {
  if (input.provider === 'GOOGLE_DRIVE') await moveExpenseFileInGoogleDrive(input);
}

export async function readStoredReceipt(companyId: number, provider: FileProvider, id: string): Promise<Buffer> {
  if (provider === 'LOCAL') return fs.promises.readFile(localPath(companyId, id));
  const { drive } = await getGoogleDriveClient(companyId);
  const file = await drive.files.get({ fileId: id, alt: 'media' }, { responseType: 'arraybuffer' });
  return Buffer.from(file.data as ArrayBuffer);
}
