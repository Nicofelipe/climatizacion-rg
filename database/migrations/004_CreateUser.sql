USE ClimatizacionRG;
GO

CREATE TABLE dbo.AppUser
(
    Id INT IDENTITY(1,1) NOT NULL,

    CompanyId INT NOT NULL,

    RoleId INT NOT NULL,

    FirstName NVARCHAR(100) NOT NULL,

    LastName NVARCHAR(100) NOT NULL,

    Email NVARCHAR(254) NOT NULL,

    PasswordHash NVARCHAR(255) NOT NULL,

    Phone NVARCHAR(30) NULL,

    LastLoginAt DATETIME2(0) NULL,

    IsActive BIT NOT NULL
        CONSTRAINT DF_AppUser_IsActive
        DEFAULT (1),

    CreatedAt DATETIME2(0) NOT NULL
        CONSTRAINT DF_AppUser_CreatedAt
        DEFAULT (SYSDATETIME()),

    UpdatedAt DATETIME2(0) NULL,

    CONSTRAINT PK_AppUser
        PRIMARY KEY (Id),

    CONSTRAINT FK_AppUser_Company
        FOREIGN KEY (CompanyId)
        REFERENCES dbo.Company(Id),

    CONSTRAINT FK_AppUser_Role
        FOREIGN KEY (RoleId)
        REFERENCES dbo.Role(Id),

    CONSTRAINT UQ_AppUser_Company_Email
        UNIQUE (CompanyId, Email)
);
GO