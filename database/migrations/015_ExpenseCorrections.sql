IF COL_LENGTH('dbo.AuditLog', 'BeforeData') IS NULL ALTER TABLE dbo.AuditLog ADD BeforeData nvarchar(max) NULL;
IF COL_LENGTH('dbo.AuditLog', 'AfterData') IS NULL ALTER TABLE dbo.AuditLog ADD AfterData nvarchar(max) NULL;
IF COL_LENGTH('dbo.AuditLog', 'Reason') IS NULL ALTER TABLE dbo.AuditLog ADD Reason nvarchar(1000) NULL;
IF COL_LENGTH('dbo.Expense', 'DriveSyncPending') IS NULL ALTER TABLE dbo.Expense ADD DriveSyncPending bit NOT NULL CONSTRAINT DF_Expense_DriveSyncPending DEFAULT 0;
