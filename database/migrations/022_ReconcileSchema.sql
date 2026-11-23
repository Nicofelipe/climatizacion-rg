-- Iguala las instalaciones nuevas con la base en uso. Idempotente: no cambia datos existentes.
IF COL_LENGTH('dbo.File','UpdatedAt') IS NULL
  ALTER TABLE dbo.[File] ADD UpdatedAt datetime2(0) NULL;
GO
IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.CompanyStorage') AND name='RootFolderId' AND is_nullable=0)
  ALTER TABLE dbo.CompanyStorage ALTER COLUMN RootFolderId nvarchar(255) NULL;
GO
IF OBJECT_ID('dbo.CompanyStorageCredential','U') IS NULL
CREATE TABLE dbo.CompanyStorageCredential(
  Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_CompanyStorageCredential PRIMARY KEY,
  CompanyStorageId int NOT NULL CONSTRAINT FK_CompanyStorageCredential_Storage REFERENCES dbo.CompanyStorage(Id),
  EncryptedRefreshToken nvarchar(max) NOT NULL,
  CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_CompanyStorageCredential_CreatedAt DEFAULT SYSDATETIME(),
  UpdatedAt datetime2(0) NULL,
  CONSTRAINT UQ_CompanyStorageCredential_Storage UNIQUE(CompanyStorageId));
GO
-- Una boleta nueva nace pendiente; nunca aprobada por omisión.
DECLARE @Name sysname=(SELECT d.name FROM sys.default_constraints d JOIN sys.columns c ON c.object_id=d.parent_object_id AND c.column_id=d.parent_column_id
  WHERE d.parent_object_id=OBJECT_ID('dbo.Expense') AND c.name='Status' AND d.definition NOT LIKE '%PENDING%');
IF @Name IS NOT NULL
BEGIN
  EXEC(N'ALTER TABLE dbo.Expense DROP CONSTRAINT '+@Name);
  ALTER TABLE dbo.Expense ADD CONSTRAINT DF_Expense_Status DEFAULT N'PENDING' FOR Status;
END;
GO
