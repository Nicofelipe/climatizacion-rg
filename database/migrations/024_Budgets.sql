-- Presupuesto mensual de la empresa (UserId NULL) o de un integrante. Opcional.
IF OBJECT_ID('dbo.Budget','U') IS NULL
BEGIN
  CREATE TABLE dbo.Budget(
    Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Budget PRIMARY KEY,
    CompanyId int NOT NULL CONSTRAINT FK_Budget_Company REFERENCES dbo.Company(Id),
    UserId int NULL CONSTRAINT FK_Budget_User REFERENCES dbo.AppUser(Id),
    MonthlyAmount decimal(18,0) NOT NULL CONSTRAINT CK_Budget_Amount CHECK(MonthlyAmount>0),
    UpdatedByUserId int NOT NULL CONSTRAINT FK_Budget_UpdatedBy REFERENCES dbo.AppUser(Id),
    UpdatedAt datetime2(0) NOT NULL CONSTRAINT DF_Budget_UpdatedAt DEFAULT SYSUTCDATETIME());
  CREATE UNIQUE INDEX UX_Budget_Company ON dbo.Budget(CompanyId) WHERE UserId IS NULL;
  CREATE UNIQUE INDEX UX_Budget_User ON dbo.Budget(CompanyId,UserId) WHERE UserId IS NOT NULL;
END;
GO
