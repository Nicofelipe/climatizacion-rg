-- IVA por boleta, duplicados por comercio y huella de la foto.
-- Las boletas existentes conservan sus montos. VatSource indica cómo se obtuvo el IVA:
--   CALCULATED  19% incluido en el total
--   RECEIPT     IVA impreso en el documento (combustible, montos exentos, otros impuestos)
--   EXEMPT      documento exento
--   NOT_STATED  el documento no lo indica y no se puede deducir (no se inventa)
IF COL_LENGTH('dbo.Expense','VatSource') IS NULL
  ALTER TABLE dbo.Expense ADD VatSource nvarchar(12) NOT NULL CONSTRAINT DF_Expense_VatSource DEFAULT N'CALCULATED'
    CONSTRAINT CK_Expense_VatSource CHECK(VatSource IN(N'CALCULATED',N'RECEIPT',N'EXEMPT',N'NOT_STATED'));
IF COL_LENGTH('dbo.Expense','DocumentType') IS NULL
  ALTER TABLE dbo.Expense ADD DocumentType nvarchar(10) NOT NULL CONSTRAINT DF_Expense_DocumentType DEFAULT N'BOLETA'
    CONSTRAINT CK_Expense_DocumentType CHECK(DocumentType IN(N'BOLETA',N'FACTURA'));
-- Número comparable: sin espacios, puntos, guiones ni ceros a la izquierda ("00-123" = "123").
IF COL_LENGTH('dbo.Expense','ReceiptKey') IS NULL
  ALTER TABLE dbo.Expense ADD ReceiptKey AS CAST(SUBSTRING(
    REPLACE(REPLACE(REPLACE(UPPER(ReceiptNumber),N' ',N''),N'.',N''),N'-',N''),
    PATINDEX(N'%[^0]%',REPLACE(REPLACE(REPLACE(UPPER(ReceiptNumber),N' ',N''),N'.',N''),N'-',N'')+N'.'),50) AS nvarchar(50)) PERSISTED;
IF COL_LENGTH('dbo.ExpenseType','VatDefault') IS NULL
  ALTER TABLE dbo.ExpenseType ADD VatDefault nvarchar(12) NOT NULL CONSTRAINT DF_ExpenseType_VatDefault DEFAULT N'CALCULATED';
IF COL_LENGTH('dbo.File','ContentHash') IS NULL
  ALTER TABLE dbo.[File] ADD ContentHash char(64) NULL;
GO
-- El total de un combustible incluye impuesto específico: el IVA no es 19/119 del total.
UPDATE dbo.ExpenseType SET VatDefault=N'NOT_STATED' WHERE Name=N'COMBUSTIBLE' AND VatDefault=N'CALCULATED';
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Expense') AND name='IX_Expense_ReceiptKey')
  CREATE INDEX IX_Expense_ReceiptKey ON dbo.Expense(CompanyId,ReceiptKey) INCLUDE(SupplierId,Status,IsDeleted,DocumentType,ExpenseDate,TotalAmount);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Expense') AND name='IX_Expense_List')
  CREATE INDEX IX_Expense_List ON dbo.Expense(CompanyId,IsDeleted,ExpenseDate DESC,Id DESC) INCLUDE(UserId,Status,TotalAmount);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.File') AND name='IX_File_ContentHash')
  CREATE INDEX IX_File_ContentHash ON dbo.[File](CompanyId,ContentHash) WHERE ContentHash IS NOT NULL;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.File') AND name='IX_File_Entity')
  CREATE INDEX IX_File_Entity ON dbo.[File](CompanyId,EntityType,EntityId);
-- Un RUT identifica a un solo comercio dentro de la empresa.
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Supplier') AND name='UX_Supplier_Company_Rut')
  AND NOT EXISTS(SELECT 1 FROM dbo.Supplier WHERE Rut IS NOT NULL GROUP BY CompanyId,Rut HAVING COUNT(*)>1)
  CREATE UNIQUE INDEX UX_Supplier_Company_Rut ON dbo.Supplier(CompanyId,Rut) WHERE Rut IS NOT NULL;
GO
-- La fecha de registro se guardaba en hora local del servidor y se mostraba como UTC (3 o 4 horas de diferencia).
DECLARE @Default sysname=(SELECT d.name FROM sys.default_constraints d JOIN sys.columns c ON c.object_id=d.parent_object_id AND c.column_id=d.parent_column_id
  WHERE d.parent_object_id=OBJECT_ID('dbo.Expense') AND c.name='CreatedAt' AND d.definition NOT LIKE '%sysutcdatetime%');
IF @Default IS NOT NULL
BEGIN
  SET XACT_ABORT ON;
  BEGIN TRANSACTION;
  UPDATE dbo.Expense SET CreatedAt=CAST(CreatedAt AT TIME ZONE 'Pacific SA Standard Time' AT TIME ZONE 'UTC' AS datetime2(0));
  EXEC(N'ALTER TABLE dbo.Expense DROP CONSTRAINT '+@Default);
  ALTER TABLE dbo.Expense ADD CONSTRAINT DF_Expense_CreatedAt DEFAULT SYSUTCDATETIME() FOR CreatedAt;
  COMMIT TRANSACTION;
END;
GO
