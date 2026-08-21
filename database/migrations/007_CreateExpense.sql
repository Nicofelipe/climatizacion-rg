USE ClimatizacionRG;
GO

CREATE TABLE dbo.Expense
(
    Id INT IDENTITY(1,1) NOT NULL,

    CompanyId INT NOT NULL,

    UserId INT NOT NULL,

    ExpenseTypeId INT NOT NULL,

    SupplierId INT NULL,

    ReceiptNumber NVARCHAR(50) NOT NULL,

    ExpenseDate DATE NOT NULL,

    Currency CHAR(3) NOT NULL
        CONSTRAINT DF_Expense_Currency
        DEFAULT ('CLP'),

    TaxRate DECIMAL(5,2) NOT NULL
        CONSTRAINT DF_Expense_TaxRate
        DEFAULT (19.00),

    NetAmount DECIMAL(18,2) NOT NULL,

    VatAmount DECIMAL(18,2) NOT NULL,

    TotalAmount DECIMAL(18,2) NOT NULL,

    Description NVARCHAR(500) NULL,

    Status NVARCHAR(20) NOT NULL
        CONSTRAINT DF_Expense_Status
        DEFAULT (N'APPROVED'),

    IsExported BIT NOT NULL
        CONSTRAINT DF_Expense_IsExported
        DEFAULT (0),

    ExportedAt DATETIME2(0) NULL,

    IsDeleted BIT NOT NULL
        CONSTRAINT DF_Expense_IsDeleted
        DEFAULT (0),

    CreatedAt DATETIME2(0) NOT NULL
        CONSTRAINT DF_Expense_CreatedAt
        DEFAULT (SYSDATETIME()),

    UpdatedAt DATETIME2(0) NULL,

    CONSTRAINT PK_Expense
        PRIMARY KEY (Id),

    CONSTRAINT FK_Expense_Company
        FOREIGN KEY (CompanyId)
        REFERENCES dbo.Company(Id),

    CONSTRAINT FK_Expense_User
        FOREIGN KEY (UserId)
        REFERENCES dbo.AppUser(Id),

    CONSTRAINT FK_Expense_ExpenseType
        FOREIGN KEY (ExpenseTypeId)
        REFERENCES dbo.ExpenseType(Id),

    CONSTRAINT FK_Expense_Supplier
        FOREIGN KEY (SupplierId)
        REFERENCES dbo.Supplier(Id),

    CONSTRAINT CK_Expense_Status
        CHECK (Status IN (
            N'PENDING',
            N'APPROVED',
            N'REJECTED'
        )),

    CONSTRAINT CK_Expense_Amounts
        CHECK (
            NetAmount >= 0
            AND VatAmount >= 0
            AND TotalAmount >= 0
        ),

    CONSTRAINT CK_Expense_TaxRate
        CHECK (
            TaxRate >= 0
            AND TaxRate <= 100
        )
);
GO