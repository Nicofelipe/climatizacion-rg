SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID(N'dbo.UserNotification',N'U') IS NULL
BEGIN
 CREATE TABLE dbo.UserNotification(
  Id int IDENTITY PRIMARY KEY,CompanyId int NOT NULL REFERENCES dbo.Company(Id),
  UserId int NOT NULL REFERENCES dbo.AppUser(Id),ExpenseId int NOT NULL REFERENCES dbo.Expense(Id),
  Kind nvarchar(30) NOT NULL CHECK(Kind IN(N'PENDING_REVIEW',N'APPROVED',N'REJECTED')),
  EventKey nvarchar(100) NOT NULL,CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),ReadAt datetime2 NULL,
  CONSTRAINT UQ_UserNotification_Event UNIQUE(CompanyId,UserId,EventKey));
 CREATE INDEX IX_UserNotification_Inbox ON dbo.UserNotification(CompanyId,UserId,ReadAt,Id DESC);
END;
IF OBJECT_ID(N'dbo.PushDevice',N'U') IS NULL
BEGIN
 CREATE TABLE dbo.PushDevice(
  Id int IDENTITY PRIMARY KEY,CompanyId int NOT NULL REFERENCES dbo.Company(Id),UserId int NOT NULL REFERENCES dbo.AppUser(Id),
  TokenHash char(64) NOT NULL UNIQUE,EncryptedToken nvarchar(max) NOT NULL,SessionVersion int NOT NULL,RegistrationId char(36) NOT NULL,
  IsActive bit NOT NULL DEFAULT 1,LastSeenAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME());
END;
IF OBJECT_ID(N'dbo.PushDelivery',N'U') IS NULL
BEGIN
 CREATE TABLE dbo.PushDelivery(
  Id int IDENTITY PRIMARY KEY,NotificationId int NOT NULL REFERENCES dbo.UserNotification(Id),DeviceId int NOT NULL REFERENCES dbo.PushDevice(Id),
  Status nvarchar(20) NOT NULL DEFAULT N'PENDING',Attempts int NOT NULL DEFAULT 0,
  NextAttemptAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),LockedUntil datetime2 NULL,SentAt datetime2 NULL,
  CONSTRAINT UQ_PushDelivery_Target UNIQUE(NotificationId,DeviceId));
 CREATE INDEX IX_PushDelivery_Queue ON dbo.PushDelivery(Status,NextAttemptAt);
END;
COMMIT TRANSACTION;
