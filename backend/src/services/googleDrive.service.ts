import fs from 'fs';
import { google } from 'googleapis';

import { getCompanyStorage } from './storage.service';
import { getStorageRefreshToken } from './storageCredential.service';
import { executeQuery } from '../database/sqlServer';
import { buildExpenseFileName } from '../utils/expenseFileName';

async function getExpenseOwnerName(companyId: number, expenseId: number) {
  const rows = await executeQuery<{ FirstName: string; LastName: string; ReceiptNumber: string }>(`
    SELECT u.FirstName, u.LastName, e.ReceiptNumber FROM dbo.Expense e
    INNER JOIN dbo.AppUser u ON u.Id = e.UserId AND u.CompanyId = e.CompanyId
    WHERE e.Id = ? AND e.CompanyId = ? AND e.IsDeleted = 0;
  `, [expenseId, companyId]);
  if (!rows[0]) throw new Error('Expense owner was not found');
  return { employeeName: `${rows[0].FirstName} ${rows[0].LastName}`, receiptNumber: rows[0].ReceiptNumber };
}



export async function getGoogleDriveClient(
  companyId: number
) {
  const storage =
    await getCompanyStorage(companyId);

  if (!storage) {
    throw new Error(
      'Google Drive is not configured for this company'
    );
  }

  const refreshToken =
    await getStorageRefreshToken(storage.Id);

  if (!refreshToken) {
    throw new Error(
      'Google Drive credentials were not found'
    );
  }

  /*
   * Creamos un cliente OAuth independiente para esta operación.
   * Es importante en una aplicación multiempresa:
   * no reutilizamos un cliente global con credenciales de otra empresa.
   */
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  auth.setCredentials({
    refresh_token: refreshToken,
  });

  const drive = google.drive({
    version: 'v3',
    auth,
  });

  return {
    drive,
    storage,
  };
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function escapeDriveQueryValue(
  value: string
): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

async function findFolder(
  drive: ReturnType<typeof google.drive>,
  parentFolderId: string,
  folderName: string
): Promise<string | null> {
  const safeName =
    escapeDriveQueryValue(folderName);

  const response = await drive.files.list({
    q: [
      `'${parentFolderId}' in parents`,
      `name = '${safeName}'`,
      `mimeType = 'application/vnd.google-apps.folder'`,
      'trashed = false',
    ].join(' and '),
    fields: 'files(id,name)',
    pageSize: 10,
  });

  return response.data.files?.[0]?.id ?? null;
}

async function createFolder(
  drive: ReturnType<typeof google.drive>,
  parentFolderId: string,
  folderName: string
): Promise<string> {
  const response = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType:
        'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id,name',
  });

  if (!response.data.id) {
    throw new Error(
      `Google Drive did not return an ID for folder ${folderName}`
    );
  }

  return response.data.id;
}

async function getOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  parentFolderId: string,
  folderName: string
): Promise<string> {
  const existingFolderId =
    await findFolder(
      drive,
      parentFolderId,
      folderName
    );

  if (existingFolderId) {
    return existingFolderId;
  }

  return createFolder(
    drive,
    parentFolderId,
    folderName
  );
}

async function getExpenseFolder(
  drive: ReturnType<typeof google.drive>,
  rootFolderId: string,
  expenseDate: string
): Promise<string> {
  const dateMatch =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      expenseDate
    );

  if (!dateMatch) {
    throw new Error(
      'Expense date must use YYYY-MM-DD format'
    );
  }

  const year = dateMatch[1];
  const monthNumber = Number(dateMatch[2]);

  if (
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    throw new Error(
      'Expense date contains an invalid month'
    );
  }

  const monthName =
    MONTH_NAMES[monthNumber - 1];

  const monthFolderName =
    `${String(monthNumber).padStart(2, '0')} - ${monthName}`;

  const yearFolderId =
    await getOrCreateFolder(
      drive,
      rootFolderId,
      year
    );

  const monthFolderId =
    await getOrCreateFolder(
      drive,
      yearFolderId,
      monthFolderName
    );

  return monthFolderId;
}


export async function validateGoogleDriveFolder(
  companyId: number
) {
  const { drive, storage } =
    await getGoogleDriveClient(companyId);

  if (!storage.RootFolderId) {
    throw new Error(
      'Google Drive folder is not configured'
    );
  }

  const response = await drive.files.get({
    fileId: storage.RootFolderId,
    fields: 'id,name,mimeType,trashed',
  });

  const folder = response.data;

  if (
    folder.mimeType !==
    'application/vnd.google-apps.folder'
  ) {
    throw new Error(
      'Configured Google Drive resource is not a folder'
    );
  }

  if (folder.trashed) {
    throw new Error(
      'Configured Google Drive folder is in the trash'
    );
  }

  return {
    id: folder.id,
    name: folder.name,
    mimeType: folder.mimeType,
  };
}

interface UploadExpenseFileInput {
  companyId: number;
  expenseId: number;
  receiptNumber?: string;
  expenseDate: string;
  localFilePath: string;
  fileName: string;
  mimeType: string;
}

export async function uploadExpenseFileToGoogleDrive(
  input: UploadExpenseFileInput
) {
  const owner = await getExpenseOwnerName(input.companyId, input.expenseId);
  const fileName = buildExpenseFileName({ ...input, ...owner,
    receiptNumber: input.receiptNumber ?? owner.receiptNumber, sourceName: input.fileName });
  const { drive, storage } =
    await getGoogleDriveClient(
      input.companyId
    );

  if (!storage.RootFolderId) {
    throw new Error(
      'Google Drive folder is not configured'
    );
  }

  if (!fs.existsSync(input.localFilePath)) {
    throw new Error(
      'Temporary expense file was not found'
    );
  }

  /*
   * Obtiene o crea automáticamente:
   *
   * Boletas/
   *   └── YYYY/
   *       └── MM - Mes/
   */
  const destinationFolderId =
    await getExpenseFolder(
      drive,
      storage.RootFolderId,
      input.expenseDate
    );

  const response =
    await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [
          destinationFolderId,
        ],
      },

      media: {
        mimeType: input.mimeType,
        body: fs.createReadStream(
          input.localFilePath
        ),
      },

      fields:
        'id,name,mimeType,parents',
    });

  if (!response.data.id) {
    throw new Error(
      'Google Drive did not return a file ID'
    );
  }

  return {
    id: response.data.id,
    name:
      response.data.name ??
      fileName,
    mimeType:
      response.data.mimeType ??
      input.mimeType,
    parents:
      response.data.parents ?? [],
  };
}

export async function deleteGoogleDriveFile(
  companyId: number,
  fileId: string
) {
  const { drive } =
    await getGoogleDriveClient(companyId);

  await drive.files.delete({
    fileId,
  });
}

interface MoveExpenseFileInput {
  companyId: number;
  expenseId: number;
  fileId: string;
  expenseDate: string;
}

export async function moveExpenseFileInGoogleDrive(
  input: MoveExpenseFileInput
) {
  const { drive, storage } =
    await getGoogleDriveClient(
      input.companyId
    );

  if (!storage.RootFolderId) {
    throw new Error(
      'Google Drive folder is not configured'
    );
  }

  /*
   * Obtenemos la carpeta destino según
   * la nueva fecha de la boleta.
   */
  const destinationFolderId =
    await getExpenseFolder(
      drive,
      storage.RootFolderId,
      input.expenseDate
    );

  /*
   * Consultamos los padres actuales.
   */
  const currentFile =
    await drive.files.get({
      fileId: input.fileId,
      fields: 'id,parents,name,mimeType',
    });

  const currentParents =
    currentFile.data.parents ?? [];
  const owner = await getExpenseOwnerName(input.companyId, input.expenseId);
  const sourceName = currentFile.data.name ?? '';
  const fileName = buildExpenseFileName({
    ...input, ...owner, sourceName,
    mimeType: currentFile.data.mimeType ?? '',
  });

  /*
   * Si ya está en la carpeta correcta,
   * no necesitamos mover nada.
   */
  if (
    fileName === sourceName && currentParents.includes(
      destinationFolderId
    )
  ) {
    return {
      id: input.fileId,
      moved: false,
      destinationFolderId,
    };
  }

  /*
   * Google Drive permite cambiar los
   * padres del archivo para moverlo.
   */
  await drive.files.update({
    fileId: input.fileId,
    requestBody: { name: fileName },

    addParents: currentParents.includes(destinationFolderId) ? undefined : destinationFolderId,

    removeParents:
      currentParents.some(parent => parent !== destinationFolderId)
        ? currentParents.filter(parent => parent !== destinationFolderId).join(',')
        : undefined,

    fields: 'id,parents',
  });

  return {
    id: input.fileId,
    moved: true,
    destinationFolderId,
  };
}
