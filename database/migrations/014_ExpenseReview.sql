USE ClimatizacionRG;
GO
IF COL_LENGTH('dbo.Expense', 'ReviewedByUserId') IS NULL
    ALTER TABLE dbo.Expense ADD ReviewedByUserId int NULL;
IF COL_LENGTH('dbo.Expense', 'ReviewedAt') IS NULL
    ALTER TABLE dbo.Expense ADD ReviewedAt datetime2(3) NULL;
IF COL_LENGTH('dbo.Expense', 'RejectionReason') IS NULL
    ALTER TABLE dbo.Expense ADD RejectionReason nvarchar(1000) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Expense_ReviewedByUser')
    ALTER TABLE dbo.Expense ADD CONSTRAINT FK_Expense_ReviewedByUser
    FOREIGN KEY (ReviewedByUserId) REFERENCES dbo.AppUser(Id);
GO
