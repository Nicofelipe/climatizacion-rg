USE ClimatizacionRG;
GO

CREATE TABLE dbo.Company
(
    Id INT IDENTITY(1,1) NOT NULL,

    Name NVARCHAR(150) NOT NULL,

    Rut NVARCHAR(15) NOT NULL,

    Email NVARCHAR(150) NULL,

    Phone NVARCHAR(30) NULL,

    Address NVARCHAR(250) NULL,

    LogoUrl NVARCHAR(500) NULL,

    IsActive BIT NOT NULL
        CONSTRAINT DF_Company_IsActive
        DEFAULT (1),

    CreatedAt DATETIME2(0) NOT NULL
        CONSTRAINT DF_Company_CreatedAt
        DEFAULT (SYSDATETIME()),

    CreatedBy INT NULL,

    UpdatedAt DATETIME2(0) NULL,

    UpdatedBy INT NULL,

    CONSTRAINT PK_Company
        PRIMARY KEY (Id),

    CONSTRAINT UQ_Company_Rut
        UNIQUE (Rut)
);
GO