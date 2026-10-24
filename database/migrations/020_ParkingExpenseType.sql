-- The mobile catalogue currently uses fixed IDs. Fail rather than overwrite an existing type.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF EXISTS (SELECT 1 FROM dbo.ExpenseType WHERE Id = 6 AND Name <> N'ESTACIONAMIENTO')
 OR EXISTS (SELECT 1 FROM dbo.ExpenseType WHERE Name = N'ESTACIONAMIENTO' AND Id <> 6)
 THROW 50001, 'Expense type catalogue needs reconciliation before adding parking.', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.ExpenseType WHERE Id = 6)
BEGIN
 SET IDENTITY_INSERT dbo.ExpenseType ON;
 INSERT INTO dbo.ExpenseType (Id, Name, Description) VALUES (6, N'ESTACIONAMIENTO', N'Gastos de estacionamiento');
 SET IDENTITY_INSERT dbo.ExpenseType OFF;
END;
COMMIT TRANSACTION;
