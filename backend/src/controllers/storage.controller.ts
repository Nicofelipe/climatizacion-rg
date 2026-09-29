import { Response } from 'express';

import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import {
    getCompanyStorage,
    upsertGoogleDriveStorage,
} from '../services/storage.service';
import { extractGoogleDriveFolderId } from '../utils/googleDrive';

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

        const { folderUrl } = req.body;

        if (!folderUrl || typeof folderUrl !== 'string') {
            res.status(400).json({
                message: 'Google Drive folder URL is required',
            });
            return;
        }

        const rootFolderId =
            extractGoogleDriveFolderId(folderUrl);

        if (!rootFolderId) {
            res.status(400).json({
                message: 'Invalid Google Drive folder URL',
            });
            return;
        }

        const storage = await upsertGoogleDriveStorage(
            req.user.companyId,
            rootFolderId
        );

        res.status(200).json({
            message: 'Google Drive storage configured successfully',
            storage,
        });
    } catch (error) {
        console.error('Update storage error:', error);

        res.status(500).json({
            message: 'Internal server error',
        });
    }
}