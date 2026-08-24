USE ClimatizacionRG;
GO

CREATE TABLE dbo.[File]
(
    Id INT IDENTITY(1,1) NOT NULL,

    CompanyId INT NOT NULL,

    EntityType NVARCHAR(50) NOT NULL,

    EntityId INT NOT NULL,

    Provider NVARCHAR(50) NOT NULL,

    ProviderFileId NVARCHAR(255) NOT NULL,

    OriginalFileName NVARCHAR(255) NOT NULL,

    MimeType NVARCHAR(100) NULL,

    FileSize BIGINT NULL,

    CreatedAt DATETIME2(0) NOT NULL
        CONSTRAINT DF_File_CreatedAt
        DEFAULT (SYSDATETIME()),

    CONSTRAINT PK_File
        PRIMARY KEY (Id),

    CONSTRAINT FK_File_Company
        FOREIGN KEY (CompanyId)
        REFERENCES dbo.Company(Id),

    CONSTRAINT CK_File_EntityType
        CHECK (EntityType IN (
            N'EXPENSE',
            N'EXPORT',
            N'PROFILE',
            N'OTHER'
        )),

    CONSTRAINT CK_File_Provider
        CHECK (Provider IN (
            N'GOOGLE_DRIVE',
            N'LOCAL',
            N'OTHER'
        ))
);
GO