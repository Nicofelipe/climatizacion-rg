USE ClimatizacionRG;
GO

CREATE TABLE dbo.Supplier
(
    Id INT IDENTITY(1,1) NOT NULL,

    CompanyId INT NOT NULL,

    Name NVARCHAR(150) NOT NULL,

    Rut NVARCHAR(15) NULL,

    Email NVARCHAR(150) NULL,

    Phone NVARCHAR(30) NULL,

    IsActive BIT NOT NULL
        CONSTRAINT DF_Supplier_IsActive
        DEFAULT (1),

    CreatedAt DATETIME2(0) NOT NULL
        CONSTRAINT DF_Supplier_CreatedAt
        DEFAULT (SYSDATETIME()),

    UpdatedAt DATETIME2(0) NULL,

    CONSTRAINT PK_Supplier
        PRIMARY KEY (Id),

    CONSTRAINT FK_Supplier_Company
        FOREIGN KEY (CompanyId)
        REFERENCES dbo.Company(Id),

    CONSTRAINT UQ_Supplier_Company_Name
        UNIQUE (CompanyId, Name)
);
GO