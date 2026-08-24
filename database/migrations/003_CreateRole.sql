USE ClimatizacionRG;
GO

CREATE TABLE dbo.Role
(
    Id INT IDENTITY(1,1) NOT NULL,

    Name NVARCHAR(50) NOT NULL,

    Description NVARCHAR(200) NULL,

    IsActive BIT NOT NULL
        CONSTRAINT DF_Role_IsActive
        DEFAULT (1),

    CreatedAt DATETIME2(0) NOT NULL
        CONSTRAINT DF_Role_CreatedAt
        DEFAULT (SYSDATETIME()),

    CONSTRAINT PK_Role
        PRIMARY KEY (Id),

    CONSTRAINT UQ_Role_Name
        UNIQUE (Name)
);
GO