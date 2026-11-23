import { executeQuery } from '../database/sqlServer';
import { normalizeRut } from '../utils/rut';

export interface SupplierRow { Id: number; Name: string; Rut: string | null }
export interface SupplierInput { supplierId?: number | null; supplierName?: string | null; supplierRut?: string | null }

export const cleanSupplierName = (value: string) => value.trim().replace(/\s+/g, ' ').slice(0, 150);

/** Valida lo que llega del formulario. El RUT, si viene, debe ser correcto y acompañar a un nombre. */
export function parseSupplier(body: Record<string, unknown>): SupplierInput {
  const id = body.supplierId ? Number(body.supplierId) : null;
  if (id !== null && (!Number.isSafeInteger(id) || id <= 0)) throw new Error('INVALID_SUPPLIER_REFERENCE');
  const name = typeof body.supplierName === 'string' ? cleanSupplierName(body.supplierName) : '';
  const rutText = typeof body.supplierRut === 'string' ? body.supplierRut.trim() : '';
  const rut = rutText ? normalizeRut(rutText) : null;
  if (rutText && !rut) throw new Error('SUPPLIER_RUT_INVALID');
  if (rut && !name && id === null) throw new Error('SUPPLIER_NAME_REQUIRED');
  return { supplierId: id, supplierName: name || null, supplierRut: rut };
}

export async function validateSupplier(companyId: number, supplierId?: number | null) {
  if (supplierId == null) return;
  const rows = await executeQuery<{ Id: number }>('SELECT Id FROM dbo.Supplier WHERE Id=? AND CompanyId=? AND IsActive=1;', [supplierId, companyId]);
  if (!rows[0]) throw new Error('INVALID_SUPPLIER_REFERENCE');
}

/** Usa el comercio indicado, o lo busca por RUT y nombre; si no existe, lo crea. */
export async function resolveSupplier(companyId: number, input: SupplierInput): Promise<number | null> {
  if (!input.supplierName) {
    await validateSupplier(companyId, input.supplierId);
    return input.supplierId ?? null;
  }
  const rows = await executeQuery<{ Id: number }>(`SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY BEGIN TRANSACTION;
    DECLARE @Company int=?,@Name nvarchar(150)=?,@Rut nvarchar(15)=?,@Id int;
    IF @Rut IS NOT NULL SELECT @Id=Id FROM dbo.Supplier WITH(UPDLOCK,HOLDLOCK) WHERE CompanyId=@Company AND Rut=@Rut;
    IF @Id IS NULL
    BEGIN
      SELECT @Id=Id FROM dbo.Supplier WITH(UPDLOCK,HOLDLOCK) WHERE CompanyId=@Company AND Name COLLATE Latin1_General_CI_AI=@Name;
      -- Mismo nombre con otro RUT es otro comercio: se distingue en el nombre para no mezclarlos.
      IF @Id IS NOT NULL AND @Rut IS NOT NULL AND EXISTS(SELECT 1 FROM dbo.Supplier WHERE Id=@Id AND Rut IS NOT NULL AND Rut<>@Rut)
      BEGIN
        SET @Id=NULL; SET @Name=LEFT(@Name,130)+N' ('+@Rut+N')';
        SELECT @Id=Id FROM dbo.Supplier WITH(UPDLOCK,HOLDLOCK) WHERE CompanyId=@Company AND Name COLLATE Latin1_General_CI_AI=@Name;
      END;
    END;
    IF @Id IS NULL
    BEGIN
      INSERT INTO dbo.Supplier(CompanyId,Name,Rut) VALUES(@Company,@Name,@Rut);
      SET @Id=CONVERT(int,SCOPE_IDENTITY());
    END
    ELSE UPDATE dbo.Supplier SET Rut=COALESCE(Rut,@Rut),IsActive=1 WHERE Id=@Id AND (IsActive=0 OR (Rut IS NULL AND @Rut IS NOT NULL));
    COMMIT TRANSACTION; SELECT @Id AS Id;
    END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK TRANSACTION; THROW; END CATCH;`,
    [companyId, input.supplierName, input.supplierRut ?? null]);
  return rows[0].Id;
}

export async function searchSuppliers(companyId: number, text: string) {
  const like = `%${text.trim().replace(/[[%_]/g, '[$&]')}%`;
  return executeQuery<SupplierRow>(`SELECT TOP 20 s.Id,s.Name,s.Rut FROM dbo.Supplier s
    WHERE s.CompanyId=? AND s.IsActive=1 AND (s.Name COLLATE Latin1_General_CI_AI LIKE ? OR s.Rut LIKE ?)
    ORDER BY (SELECT COUNT(*) FROM dbo.Expense e WHERE e.CompanyId=s.CompanyId AND e.SupplierId=s.Id AND e.IsDeleted=0) DESC,s.Name;`,
    [companyId, like, like]);
}
