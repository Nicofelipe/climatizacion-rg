IF OBJECT_ID('dbo.PasswordResetToken','U') IS NULL
CREATE TABLE dbo.PasswordResetToken(
  Id bigint IDENTITY PRIMARY KEY,CompanyId int NOT NULL,UserId int NOT NULL,
  TokenHash char(64) NOT NULL UNIQUE,PasswordVersion int NOT NULL,RequestedEmail nvarchar(254) NOT NULL,
  ExpiresAt datetime2 NOT NULL,UsedAt datetime2 NULL,
  CONSTRAINT FK_PasswordReset_User FOREIGN KEY(UserId) REFERENCES dbo.AppUser(Id),
  CONSTRAINT FK_PasswordReset_Company FOREIGN KEY(CompanyId) REFERENCES dbo.Company(Id)
);
