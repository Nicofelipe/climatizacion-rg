USE ClimatizacionRG;
GO

CREATE TABLE dbo.AuditLog
(
    Id BIGINT IDENTITY(1,1) NOT NULL,

    CompanyId INT NOT NULL,

    UserId INT NULL,

    Action NVARCHAR(100) NOT NULL,

    Entity NVARCHAR(100) NULL,

    EntityId INT NULL,

    IpAddress NVARCHAR(45) NULL,

    Device NVARCHAR(250) NULL,

    CreatedAt DATETIME2(0) NOT NULL
        CONSTRAINT DF_AuditLog_CreatedAt
        DEFAULT (SYSDATETIME()),

    CONSTRAINT PK_AuditLog
        PRIMARY KEY (Id),

    CONSTRAINT FK_AuditLog_Company
        FOREIGN KEY (CompanyId)
        REFERENCES dbo.Company(Id),

    CONSTRAINT FK_AuditLog_User
        FOREIGN KEY (UserId)
        REFERENCES dbo.AppUser(Id)
);
GO