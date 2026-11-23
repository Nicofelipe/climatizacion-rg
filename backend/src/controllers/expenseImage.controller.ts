import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { getExpenseById } from '../services/expense.service';
import { readStoredReceipt } from '../services/receiptStorage.service';
import { driveUnavailableMessage, isDriveAuthorizationError, safeErrorMessage } from '../utils/storageError';

export async function getExpenseImageController(req: AuthenticatedRequest, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  if (!req.user) { res.status(401).json({ message: 'Debes iniciar sesión.' }); return; }
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({ message: 'Identificador de boleta inválido.' }); return;
  }
  try {
    const expense = await getExpenseById(req.user.companyId, id, req.user.userId, req.user.role);
    const file = expense?.file;
    if (!file?.ProviderFileId || (file.Provider !== 'GOOGLE_DRIVE' && file.Provider !== 'LOCAL')) {
      res.status(404).json({ message: 'Boleta o imagen no disponible.' }); return;
    }
    const mime = file.MimeType ?? '';
    if (!/^image\/(jpeg|png|webp|gif|heic|heif)$/i.test(mime)) {
      res.status(415).json({ message: 'El formato de esta imagen no admite vista previa.' }); return;
    }
    const bytes = await readStoredReceipt(req.user.companyId, file.Provider, file.ProviderFileId);
    res.json({ dataUri: `data:${mime};base64,${bytes.toString('base64')}` });
  } catch (error) {
    console.error('Receipt image error:', safeErrorMessage(error));
    res.status(isDriveAuthorizationError(error) ? 409 : 502).json({
      message: isDriveAuthorizationError(error) ? driveUnavailableMessage(req.user.role)
        : 'No fue posible cargar la imagen. Inténtalo nuevamente.',
    });
  }
}
