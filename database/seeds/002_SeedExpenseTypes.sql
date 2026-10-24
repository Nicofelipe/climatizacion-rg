USE ClimatizacionRG;
GO

INSERT INTO dbo.ExpenseType (Name, Description)
SELECT N'COLACION', N'Gastos de alimentación'
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.ExpenseType
    WHERE Name = N'COLACION'
);

INSERT INTO dbo.ExpenseType (Name, Description)
SELECT N'COMBUSTIBLE', N'Gastos de combustible'
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.ExpenseType
    WHERE Name = N'COMBUSTIBLE'
);

INSERT INTO dbo.ExpenseType (Name, Description)
SELECT N'MATERIALES', N'Compra de materiales'
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.ExpenseType
    WHERE Name = N'MATERIALES'
);

INSERT INTO dbo.ExpenseType (Name, Description)
SELECT N'INSUMOS', N'Compra de insumos'
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.ExpenseType
    WHERE Name = N'INSUMOS'
);

INSERT INTO dbo.ExpenseType (Name, Description)
SELECT N'OTROS', N'Otros gastos'
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.ExpenseType
    WHERE Name = N'OTROS'
);
GO