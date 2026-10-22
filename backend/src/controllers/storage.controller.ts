import { Response } from 'express';

import { createDriveAttempt,consumeDriveAttempt } from '../services/driveOAuthState.service';
import { getPasswordAccount,passwordPolicy } from '../services/passwordPolicy.service';
import { googleOAuthClient } from '../config/googleOAuth';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { validateGoogleDriveFolder,validateDriveRefreshToken } from '../services/googleDrive.service';
import {
    getCompanyStorage,
} from '../services/storage.service';
import { upsertStorageCredential } from '../services/storageCredential.service';
import { safeErrorMessage } from '../utils/storageError';

export async function testGoogleDriveController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      res.status(401).json({
        message: 'Authentication required',
      });
      return;
    }

    const folder = await validateGoogleDriveFolder(
      req.user.companyId
    );

    res.status(200).json({
      connected: true,
      folder,
    });
  } catch (error) {
    console.error(
      'Google Drive test error:',
      safeErrorMessage(error)
    );

    res.status(400).json({
      connected: false,
      message:
        'No se pudo verificar Drive. Si la autorización venció, vuelve a conectar la cuenta con acceso a la carpeta.',
    });
  }
}

export async function getStorageController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.user) {
            res.status(401).json({
                message: 'Authentication required',
            });
            return;
        }

        const storage = await getCompanyStorage(
            req.user.companyId
        );

        res.status(200).json({
            storage,
        });
    } catch (error) {
        console.error('Get storage error:', error);

        res.status(500).json({
            message: 'Internal server error',
        });
    }
}

export async function updateGoogleDriveStorageController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.user) {
            res.status(401).json({
                message: 'Authentication required',
            });
            return;
        }

        res.status(403).json({
            code: 'STORAGE_FOLDER_LOCKED',
            message: 'La carpeta de respaldo es fija y no se puede cambiar desde la aplicación. Contacta al responsable técnico.',
        });
    } catch (error) {
        console.error('Update storage error:', error);

        res.status(500).json({
            message: 'Internal server error',
        });
    }
}

export async function connectGoogleDriveController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      res.status(401).json({
        message: 'Authentication required',
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const storage = await getCompanyStorage(req.user.companyId);
    if (!storage?.RootFolderId) {
      res.status(409).json({ message: 'La carpeta de respaldo debe ser configurada por el responsable técnico antes de renovar el acceso.' });
      return;
    }

    const account=await getPasswordAccount(req.user.companyId,req.user.userId);
    if(!account||account.RoleName!=='ADMIN'||passwordPolicy(account).expired){res.sendStatus(403);return;}
    const state=createDriveAttempt(req.user.companyId,req.user.userId,account.PasswordVersion);

    const authorizationUrl =
      googleOAuthClient.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [
          'https://www.googleapis.com/auth/drive.file',
        ],
        state,
      });

    res.status(200).json({
      authorizationUrl,
    });
  } catch (error) {
    console.error(
      'Google Drive connection error:',
      safeErrorMessage(error)
    );

    res.status(500).json({
      message: 'Internal server error',
    });
  }
}


export async function googleDriveCallbackController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const {
      code,
      state,
    } = req.query;

    if (
      typeof code !== 'string' ||
      typeof state !== 'string'
    ) {
      res.status(400).json({
        message: 'Missing OAuth code or state',
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const decoded=consumeDriveAttempt(state);
    const account=await getPasswordAccount(decoded.companyId,decoded.userId);
    if(!account||account.RoleName!=='ADMIN'||account.PasswordVersion!==decoded.passwordVersion||passwordPolicy(account).expired){
      res.status(400).json({
        message: 'Invalid OAuth state',
      });
      return;
    }

    // Reconnection can renew credentials only; folder IDs from the request are ignored.
    const existingStorage = await getCompanyStorage(decoded.companyId);
    if (!existingStorage?.RootFolderId) {
      res.status(400).json({
        message: 'La carpeta de respaldo no está configurada. Contacta al responsable técnico.',
      });
      return;
    }

    /*
     * Intercambiamos el authorization code por los
     * tokens OAuth de Google.
     */
    const { tokens } =
      await googleOAuthClient.getToken(code);

    if (!tokens.refresh_token) {
      res.status(400).json({
        message:
          'Google did not return a refresh token',
      });
      return;
    }

    // Check the new account can access the fixed folder before replacing a
    // working credential. No folder or account identifiers come from the URL.
    await validateDriveRefreshToken(existingStorage.RootFolderId,tokens.refresh_token);

    /*
     * Guardamos el refresh token cifrado.
     */
    await upsertStorageCredential(
      existingStorage.Id,
      tokens.refresh_token,
      {companyId:decoded.companyId,userId:decoded.userId,passwordVersion:decoded.passwordVersion}
    );

    res.status(200).type('html').send('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Drive conectado</title><body style="font-family:system-ui;padding:40px;max-width:560px;margin:auto"><h1>Google Drive conectado</h1><p>La autorización se actualizó correctamente. Puedes cerrar esta pestaña y volver al formulario de la boleta para guardarla.</p></body></html>');
  } catch (error) {
    console.error(
      'Google Drive OAuth callback error:',
      safeErrorMessage(error)
    );

    res.status(400).json({
      message:
        'Google Drive authorization failed',
    });
  }
}
