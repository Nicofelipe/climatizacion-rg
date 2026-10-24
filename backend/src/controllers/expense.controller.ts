import { Response } from 'express';
import { validExpenseFields } from '../utils/expenseInput';
import {receiptSubmissionError} from '../utils/receiptSubmission';
import { lockExpenseOperation } from '../services/expenseOperationLock.service';
import { autoApproveSoleAdmin } from '../services/approvalPolicy.service';
import fs from 'fs/promises';
import { driveUnavailableMessage, isDriveAuthorizationError, safeErrorMessage } from '../utils/storageError';

import {
    deleteGoogleDriveFile,
    moveExpenseFileInGoogleDrive,
    uploadExpenseFileToGoogleDrive,
} from '../services/googleDrive.service';

import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import {
    createExpense,
    finishExpenseSync,
    deleteExpense,
    getExpenseById,
    getExpenses,
    rollbackCreatedExpense,
    rollbackUpdatedExpense,
    updateExpense,
} from '../services/expense.service';

import {
    createExpenseFile,
    getExpenseFile,
    rollbackCreatedExpenseFile,
    rollbackUpdatedExpenseFile,
    updateExpenseFile,
} from '../services/file.service';

function normalizeDateOnly(
    value: Date | string
): string {
    if (value instanceof Date) {
        const year = value.getUTCFullYear();

        const month = String(
            value.getUTCMonth() + 1
        ).padStart(2, '0');

        const day = String(
            value.getUTCDate()
        ).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    return String(value).slice(0, 10);
}

export async function createExpenseController(
    req: AuthenticatedRequest,
    res: Response
) {
    const temporaryFilePath = req.file?.path ?? null;

    /*
     * Los utilizamos para compensar la operación
     * si algo falla después de crear recursos.
     */
    let createdExpenseId: number | null = null;
    let releaseOperation:(()=>void)|null=null;
    let newDriveFileId: string | null = null;

    try {
        if (!req.user) {
            res.status(401).json({
                message: 'Authentication required',
            });
            return;
        }

        const expenseTypeId = Number(
            req.body.expenseTypeId
        );

        const totalAmount = Number(
            req.body.totalAmount
        );

        const supplierId =
            req.body.supplierId
                ? Number(req.body.supplierId)
                : null;

        const receiptNumber =
            req.body.receiptNumber;

        const expenseDate =
            req.body.expenseDate;

        const description =
            req.body.description || null;

        const submissionError=receiptSubmissionError(expenseDate);
        if(submissionError){res.status(400).json({message:submissionError});return;}

        if (
            !Number.isInteger(expenseTypeId) ||
            expenseTypeId <= 0 ||
            !validExpenseFields(receiptNumber,expenseDate,totalAmount,description)
        ) {
            res.status(400).json({
                message:
                    'Missing or invalid required fields',
            });
            return;
        }

        if (
            supplierId !== null &&
            (
                !Number.isInteger(supplierId) ||
                supplierId <= 0
            )
        ) {
            res.status(400).json({
                message: 'Invalid supplier id',
            });
            return;
        }

        if (!req.file) {
            res.status(400).json({
                message: 'La imagen de la boleta es obligatoria',
            });
            return;
        }

        /*
         * 1. Crear Expense.
         */
        const expense =
            await createExpense({
                companyId:
                    req.user.companyId,

                userId:
                    req.user.userId,

                expenseTypeId,
                supplierId,
                receiptNumber,
                expenseDate,
                totalAmount,
                description,
            });

        createdExpenseId = expense.Id;
        releaseOperation=lockExpenseOperation(req.user.companyId,expense.Id);
        if(!releaseOperation)throw new Error('EXPENSE_OPERATION_BUSY');

        /*
         * 2. Si existe imagen, subirla a Drive.
         */
        if (req.file) {
            const driveFile =
                await uploadExpenseFileToGoogleDrive({
                    expenseId: expense.Id,
                    receiptNumber,
                    companyId:
                        req.user.companyId,

                    expenseDate,

                    localFilePath:
                        req.file.path,

                    fileName:
                        req.file.filename,

                    mimeType:
                        req.file.mimetype,
                });

            newDriveFileId =
                driveFile.id;


            /*
             * 3. Registrar la imagen en SQL.
             */
            await createExpenseFile({
                companyId:
                    req.user.companyId,

                expenseId:
                    expense.Id,

                provider:
                    'GOOGLE_DRIVE',

                providerFileId:
                    driveFile.id,

                originalFileName:
                    req.file.originalname,

                mimeType:
                    req.file.mimetype,

                fileSize:
                    req.file.size,
            });

            /*
             * Drive + dbo.File quedaron correctos.
             * Ya no consideramos el archivo como
             * pendiente de compensación.
             */
            newDriveFileId = null;
        }

        /*
         * Todo terminó correctamente.
         */
        createdExpenseId = null;

        await finishExpenseSync(req.user.companyId,expense.Id);

        let approvalNotice: string | null = null;
        if(req.user.role==='ADMIN') {
            try { if(await autoApproveSoleAdmin(req.user.companyId,req.user.userId,expense.Id)) expense.Status='APPROVED'; }
            catch { approvalNotice='Boleta guardada como pendiente. No fue posible comprobar la aprobación automática; revisa su estado desde el detalle.'; }
        }

        res.status(201).json({
            approvalNotice,
            message:
                'Expense created successfully',
            expense,
        });
    } catch (error) {
        /*
         * Si alcanzamos a subir una imagen a
         * Drive pero algo posterior falló,
         * intentamos eliminarla.
         */
        if (
            newDriveFileId &&
            req.user
        ) {
            try {
                await deleteGoogleDriveFile(
                    req.user.companyId,
                    newDriveFileId
                );

                newDriveFileId = null;
            } catch (
            driveCleanupError
            ) {
                console.error(
                    'Google Drive rollback error:',
                    safeErrorMessage(driveCleanupError)
                );
            }
        }

        /*
         * Si Expense alcanzó a crearse pero la
         * operación completa falló, lo retiramos.
         */
        if (
            createdExpenseId &&
            req.user
        ) {
            try {
                await rollbackCreatedExpense(
                    req.user.companyId,
                    createdExpenseId
                );

                createdExpenseId = null;
            } catch (
            expenseRollbackError
            ) {
                console.error(
                    'Expense rollback error:',
                    expenseRollbackError
                );
            }
        }

        if (
            error instanceof Error &&
            error.message ===
            'RECEIPT_NUMBER_ALREADY_EXISTS'
        ) {
            res.status(409).json({
                message:
                    'A receipt with this number already exists',
            });
            return;
        }

        if(error instanceof Error&&error.message==='INVALID_SUPPLIER_REFERENCE'){res.status(400).json({message:'El proveedor no está disponible para tu empresa.'});return;}
        console.error('Create expense error:', safeErrorMessage(error));

        if (isDriveAuthorizationError(error)) {
            res.status(409).json({
                code: 'DRIVE_RECONNECT_REQUIRED',
                message: driveUnavailableMessage(req.user?.role ?? 'EMPLOYEE'),
            });
            return;
        }

        res.status(500).json({
            message:
                'Internal server error',
        });
    } finally {
        releaseOperation?.();
        /*
         * uploads/ siempre es temporal.
         */
        if (temporaryFilePath) {
            try {
                await fs.unlink(
                    temporaryFilePath
                );
            } catch (cleanupError) {
                console.error(
                    'Temporary file cleanup error:',
                    cleanupError
                );
            }
        }
    }
}

export async function getExpensesController(
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

        const expenses = await getExpenses(
            req.user.companyId,
            req.user.userId,
            req.user.role
        );

        res.status(200).json({
            expenses,
        });
    } catch (error) {
        console.error('Get expenses error:', error);

        res.status(500).json({
            message: 'Internal server error',
        });
    }
}

export async function getExpenseByIdController(
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

        const expenseId = Number(req.params.id);

        if (!Number.isInteger(expenseId) || expenseId <= 0) {
            res.status(400).json({
                message: 'Invalid expense id',
            });
            return;
        }

        const expense = await getExpenseById(
            req.user.companyId,
            expenseId,
            req.user.userId,
            req.user.role
        );

        if (!expense) {
            res.status(404).json({
                message: 'Expense not found',
            });
            return;
        }

        res.status(200).json({
            expense,
        });
    } catch (error) {
        console.error('Get expense detail error:', error);

        res.status(500).json({
            message: 'Internal server error',
        });
    }
}

export async function updateExpenseController(
    req: AuthenticatedRequest,
    res: Response
) {
    const temporaryFilePath = req.file?.path ?? null;
    let newDriveFileId: string | null = null;

    let expenseWasUpdated = false;
    let originalExpenseForRollback: any = null;

    let fileWasUpdated = false;
    let originalFileForRollback: any = null;
    let fileWasCreated = false;

    let expenseId: number | null = null;
    let releaseOperation:(()=>void)|null=null;

    try {
        if (!req.user) {
            res.status(401).json({
                message: 'Authentication required',
            });
            return;
        }

        expenseId = Number(req.params.id);

        if (
            !Number.isInteger(expenseId) ||
            expenseId <= 0
        ) {
            res.status(400).json({
                message: 'Invalid expense id',
            });
            return;
        }

        releaseOperation=lockExpenseOperation(req.user.companyId,expenseId);
        if(!releaseOperation){res.status(409).json({message:'La boleta tiene otra operación en curso. Espera y recarga su detalle.'});return;}

        /*
         * Con multipart/form-data los valores
         * llegan como strings.
         */
        const expenseTypeId = Number(
            req.body.expenseTypeId
        );

        const totalAmount = Number(
            req.body.totalAmount
        );

        const supplierId =
            req.body.supplierId
                ? Number(req.body.supplierId)
                : null;

        const receiptNumber =
            req.body.receiptNumber;

        const expenseDate =
            req.body.expenseDate;

        const description =
            req.body.description || null;

        if (
            !Number.isInteger(expenseTypeId) ||
            expenseTypeId <= 0 ||
            !validExpenseFields(receiptNumber,expenseDate,totalAmount,description)
        ) {
            res.status(400).json({
                message:
                    'Missing or invalid required fields',
            });
            return;
        }

        if (
            supplierId !== null &&
            (
                !Number.isInteger(supplierId) ||
                supplierId <= 0
            )
        ) {
            res.status(400).json({
                message: 'Invalid supplier id',
            });
            return;
        }

        /*
         * Obtenemos primero la boleta original.
         *
         * Esto también aplica la seguridad que
         * ya implementamos:
         *
         * EMPLOYEE → solamente las propias
         * ADMIN    → todas las de su empresa
         */
        const originalExpense =
            await getExpenseById(
                req.user.companyId,
                expenseId,
                req.user.userId,
                req.user.role
            );

        if (!originalExpense) {
            res.status(404).json({
                message: 'Expense not found',
            });
            return;
        }

        originalExpenseForRollback =
            originalExpense;

        if (originalExpense.UserId !== req.user.userId) {
            res.status(403).json({message:'Solo puedes editar tus propias boletas pendientes. Las de otros integrantes se aprueban o rechazan sin modificar sus datos.'});
            return;
        }

        /*
         * Todos los roles solamente pueden editar
         * una boleta PENDING.
         */
        if (
            originalExpense.Status !== 'PENDING'
        ) {
            res.status(409).json({
                message:
                    'Only pending expenses can be edited',
            });
            return;
        }

        const submissionError=receiptSubmissionError(expenseDate);
        if(submissionError){res.status(400).json({message:submissionError});return;}

        const currentFile =
            await getExpenseFile(
                req.user.companyId,
                expenseId
            );

        originalFileForRollback =
            currentFile;

        /*
         * =================================================
         * CASO 1:
         * El usuario seleccionó una imagen nueva.
         * =================================================
         *
         * Primero subimos la nueva.
         * Todavía NO eliminamos la anterior.
         */
        if (req.file) {
            const driveFile =
                await uploadExpenseFileToGoogleDrive({
                    expenseId,
                    receiptNumber,
                    companyId:
                        req.user.companyId,

                    expenseDate,

                    localFilePath:
                        req.file.path,

                    fileName:
                        req.file.filename,

                    mimeType:
                        req.file.mimetype,
                });

            newDriveFileId =
                driveFile.id;
        }

        /*
         * Actualizamos los datos de la boleta.
         *
         * updateExpense vuelve a comprobar
         * permisos y estado a nivel SQL.
         */
        const expense =
            await updateExpense({
                companyId:
                    req.user.companyId,

                userId:
                    req.user.userId,

                role:
                    req.user.role,

                expenseId,
                expenseTypeId,
                supplierId,
                receiptNumber,
                expenseDate,
                totalAmount,
                description,
            });

        if (!expense) {
            /*
             * Si ya habíamos subido una imagen
             * nueva pero el UPDATE no fue posible,
             * la eliminamos de Drive.
             */
            if (newDriveFileId) {
                try {
                    await deleteGoogleDriveFile(
                        req.user.companyId,
                        newDriveFileId
                    );

                    newDriveFileId = null;
                } catch (
                compensationError
                ) {
                    console.error(
                        'Google Drive compensation error:',
                        safeErrorMessage(compensationError)
                    );
                }
            }

            res.status(404).json({
                message: 'Expense not found',
            });
            return;
        }

        expenseWasUpdated = true;
        /*
         * =================================================
         * CASO 2:
         * Hay una imagen nueva.
         * =================================================
         */
        if (
            req.file &&
            newDriveFileId
        ) {
            if (currentFile) {
                /*
                 * Cambiamos dbo.File para que
                 * apunte a la imagen nueva.
                 */
                const updatedFile =
                    await updateExpenseFile({
                        companyId:
                            req.user.companyId,

                        expenseId,

                        provider:
                            'GOOGLE_DRIVE',

                        providerFileId:
                            newDriveFileId,

                        originalFileName:
                            req.file.originalname,

                        mimeType:
                            req.file.mimetype,

                        fileSize:
                            req.file.size,
                    });

                if (!updatedFile) {
                    throw new Error(
                        'EXPENSE_FILE_UPDATE_FAILED'
                    );
                }

                fileWasUpdated = true;

                // Keep the previous image in the private company backup.
                // A later rollback must never point to an already deleted file.
            } else {
                /*
                 * La boleta no tenía imagen.
                 * Creamos su registro dbo.File.
                 */
                await createExpenseFile({
                    companyId:
                        req.user.companyId,

                    expenseId,

                    provider:
                        'GOOGLE_DRIVE',

                    providerFileId:
                        newDriveFileId,

                    originalFileName:
                        req.file.originalname,

                    mimeType:
                        req.file.mimetype,

                    fileSize:
                        req.file.size,
                });

                fileWasCreated = true;

            }

            /*
             * La imagen nueva ya quedó registrada
             * correctamente en dbo.File.
             */
            newDriveFileId = null;
        }

        /*
         * =================================================
         * CASO 3:
         * Sin imagen nueva: sincronizar nombre y carpeta con los datos actuales.
         * =================================================
         */
        if (
            !req.file &&
            currentFile &&
            currentFile.Provider ===
            'GOOGLE_DRIVE'
        ) {
            await moveExpenseFileInGoogleDrive({
                expenseId,
                companyId:
                    req.user.companyId,

                fileId:
                    currentFile.ProviderFileId,

                expenseDate,
            });
        }
        await finishExpenseSync(req.user.companyId,expenseId);
        expenseWasUpdated = false;
        fileWasUpdated = false;
        fileWasCreated = false;

        originalExpenseForRollback = null;
        originalFileForRollback = null;

        res.status(200).json({
            message:
                'Expense updated successfully',

            expense,
        });
    } catch (error) {
        /*
  * Si la boleta originalmente no tenía
  * dbo.File y alcanzamos a crear uno nuevo,
  * eliminamos ese registro.
  */
        if (
            fileWasCreated &&
            req.user &&
            expenseId !== null
        ) {
            try {
                await rollbackCreatedExpenseFile(
                    req.user.companyId,
                    expenseId
                );

                fileWasCreated = false;
            } catch (fileRollbackError) {
                console.error(
                    'Created expense file rollback error:',
                    fileRollbackError
                );
            }
        }
        if (
            fileWasUpdated &&
            originalFileForRollback &&
            req.user &&
            expenseId !== null
        ) {
            try {
                await rollbackUpdatedExpenseFile({
                    companyId:
                        req.user.companyId,

                    expenseId,

                    provider:
                        originalFileForRollback
                            .Provider,

                    providerFileId:
                        originalFileForRollback
                            .ProviderFileId,

                    originalFileName:
                        originalFileForRollback
                            .OriginalFileName,

                    mimeType:
                        originalFileForRollback
                            .MimeType,

                    fileSize:
                        originalFileForRollback
                            .FileSize,

                    updatedAt:
                        originalFileForRollback
                            .UpdatedAt,
                });

                fileWasUpdated = false;
            } catch (fileRollbackError) {
                console.error(
                    'Expense file rollback error:',
                    fileRollbackError
                );
            }
        }
        /*
         * Si habíamos subido una imagen nueva
         * y algo falló después, intentamos
         * eliminarla de Google Drive.
         */
        if (
            newDriveFileId &&
            req.user
        ) {
            try {
                await deleteGoogleDriveFile(
                    req.user.companyId,
                    newDriveFileId
                );

                newDriveFileId = null;
            } catch (compensationError) {
                console.error(
                    'Google Drive compensation error:',
                    safeErrorMessage(compensationError)
                );
            }
        }

        /*
         * Si el UPDATE de Expense ya se había
         * realizado, restauramos los datos
         * originales de la boleta.
         */
        if (
            expenseWasUpdated &&
            originalExpenseForRollback &&
            req.user &&
            expenseId !== null
        ) {
            try {
                await rollbackUpdatedExpense({
                    companyId:
                        req.user.companyId,

                    expenseId,

                    expenseTypeId:
                        originalExpenseForRollback
                            .ExpenseTypeId,

                    supplierId:
                        originalExpenseForRollback
                            .SupplierId,

                    receiptNumber:
                        originalExpenseForRollback
                            .ReceiptNumber,

                    expenseDate:
                        normalizeDateOnly(
                            originalExpenseForRollback
                                .ExpenseDate
                        ),

                    netAmount:
                        originalExpenseForRollback
                            .NetAmount,

                    vatAmount:
                        originalExpenseForRollback
                            .VatAmount,

                    totalAmount:
                        originalExpenseForRollback
                            .TotalAmount,

                    description:
                        originalExpenseForRollback
                            .Description,
                });

                expenseWasUpdated = false;
            } catch (rollbackError) {
                console.error(
                    'Expense update rollback error:',
                    rollbackError
                );
            }
        }

        /*
         * Número de boleta duplicado.
         */
        if (
            error instanceof Error &&
            error.message ===
            'RECEIPT_NUMBER_ALREADY_EXISTS'
        ) {
            res.status(409).json({
                message:
                    'A receipt with this number already exists',
            });
            return;
        }

        if(error instanceof Error&&error.message==='INVALID_SUPPLIER_REFERENCE'){res.status(400).json({message:'El proveedor no está disponible para tu empresa.'});return;}
        console.error('Update expense error:', safeErrorMessage(error));

        if (isDriveAuthorizationError(error)) {
            res.status(409).json({
                code: 'DRIVE_RECONNECT_REQUIRED',
                message: driveUnavailableMessage(req.user?.role ?? 'EMPLOYEE'),
            });
            return;
        }

        res.status(500).json({
            message:
                'Internal server error',
        });
    } finally {
        releaseOperation?.();
        /*
         * Multer solamente usa uploads/
         * como almacenamiento temporal.
         */
        if (temporaryFilePath) {
            try {
                await fs.unlink(
                    temporaryFilePath
                );
            } catch (cleanupError) {
                console.error(
                    'Temporary file cleanup error:',
                    cleanupError
                );
            }
        }
    }
}

export async function deleteExpenseController(
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

        const expenseId = Number(req.params.id);

        if (!Number.isInteger(expenseId) || expenseId <= 0) {
            res.status(400).json({
                message: 'Invalid expense id',
            });
            return;
        }

        const expense = await deleteExpense(
            req.user.companyId,
            expenseId,
            req.user.userId,
            req.user.role
        );

        if (!expense) {
            res.status(404).json({
                message: 'Expense not found',
            });
            return;
        }

        res.status(200).json({
            message: 'Expense deleted successfully',
        });
    } catch (error) {
        console.error('Delete expense error:', error);

        res.status(500).json({
            message: 'Internal server error',
        });
    }
}
