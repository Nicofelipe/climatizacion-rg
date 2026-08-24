USE ClimatizacionRG;
GO

CREATE TABLE dbo.CompanyStorage
(
    Id INT IDENTITY(1,1) NOT NULL,

    CompanyId INT NOT NULL,

    Provider NVARCHAR(50) NOT NULL,

    RootFolderId NVARCHAR(255) NOT NULL,

    IsActive BIT NOT NULL
        CONSTRAINT DF_CompanyStorage_IsActive
        DEFAULT (1),

    CreatedAt DATETIME2(0) NOT NULL
        CONSTRAINT DF_CompanyStorage_CreatedAt
        DEFAULT (SYSDATETIME()),

    UpdatedAt DATETIME2(0) NULL,

    CONSTRAINT PK_CompanyStorage
        PRIMARY KEY (Id),

    CONSTRAINT FK_CompanyStorage_Company
        FOREIGN KEY (CompanyId)
        REFERENCES dbo.Company(Id),

    CONSTRAINT UQ_CompanyStorage_Company_Provider
        UNIQUE (CompanyId, Provider),

    CONSTRAINT CK_CompanyStorage_Provider
        CHECK (Provider IN (
            N'GOOGLE_DRIVE',
            N'ONEDRIVE',
            N'DROPBOX',
            N'OTHER'
        ))
);
GO