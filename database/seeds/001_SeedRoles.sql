USE ClimatizacionRG;
GO

IF NOT EXISTS (
    SELECT 1
    FROM dbo.Role
    WHERE Name = N'ADMIN'
)
BEGIN
    INSERT INTO dbo.Role
    (
        Name,
        Description
    )
    VALUES
    (
        N'ADMIN',
        N'Administrador de la empresa'
    );
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM dbo.Role
    WHERE Name = N'EMPLOYEE'
)
BEGIN
    INSERT INTO dbo.Role
    (
        Name,
        Description
    )
    VALUES
    (
        N'EMPLOYEE',
        N'Empleado de la empresa'
    );
END;
GO