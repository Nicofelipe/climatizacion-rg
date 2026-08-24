USE ClimatizacionRG;
GO

CREATE TABLE dbo.ExportHistory
(
    Id INT IDENTITY(1,1) NOT NULL,

    CompanyId INT NOT NULL,

    GeneratedByUserId INT NOT NULL,

    [Year] SMALLINT NOT NULL,

    [Month] TINYINT NOT NULL,

    Provider NVARCHAR(50) NOT NULL
        CONSTRAINT DF_ExportHistory_Provider
        DEFAULT (N'GOOGLE_DRIVE'),

    ProviderFileId NVARCHAR(255) NULL,

    FileName NVARCHAR(255) NULL,

    Status NVARCHAR(20) NOT NULL
        CONSTRAINT DF_ExportHistory_Status
        DEFAULT (N'PENDING'),

    ExportedAt DATETIME2(0) NULL,

    CreatedAt DATETIME2(0) NOT NULL
        CONSTRAINT DF_ExportHistory_CreatedAt
        DEFAULT (SYSDATETIME()),

    CONSTRAINT PK_ExportHistory
        PRIMARY KEY (Id),

    CONSTRAINT FK_ExportHistory_Company
        FOREIGN KEY (CompanyId)
        REFERENCES dbo.Company(Id),

    CONSTRAINT FK_ExportHistory_User
        FOREIGN KEY (GeneratedByUserId)
        REFERENCES dbo.AppUser(Id),

    CONSTRAINT CK_ExportHistory_Month
        CHECK ([Month] BETWEEN 1 AND 12),

    CONSTRAINT CK_ExportHistory_Year
        CHECK ([Year] BETWEEN 2000 AND 2100),

    CONSTRAINT CK_ExportHistory_Status
        CHECK (Status IN (
            N'PENDING',
            N'COMPLETED',
            N'FAILED'
        ))
);
GO