USE ClimatizacionRG;
GO

CREATE TABLE dbo.ExpenseType
(
    Id INT IDENTITY(1,1) NOT NULL,

    Name NVARCHAR(100) NOT NULL,

    Description NVARCHAR(250) NULL,

    IsActive BIT NOT NULL
        CONSTRAINT DF_ExpenseType_IsActive
        DEFAULT (1),

    CreatedAt DATETIME2(0) NOT NULL
        CONSTRAINT DF_ExpenseType_CreatedAt
        DEFAULT (SYSDATETIME()),

    CONSTRAINT PK_ExpenseType
        PRIMARY KEY (Id),

    CONSTRAINT UQ_ExpenseType_Name
        UNIQUE (Name)
);
GO