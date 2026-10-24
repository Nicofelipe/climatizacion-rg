IF COL_LENGTH('dbo.AppUser','MustChangePassword') IS NULL ALTER TABLE dbo.AppUser ADD MustChangePassword bit NOT NULL CONSTRAINT DF_AppUser_MustChangePassword DEFAULT 0;
IF COL_LENGTH('dbo.AppUser','FirstLoginAt') IS NULL ALTER TABLE dbo.AppUser ADD FirstLoginAt datetime2 NULL;
IF COL_LENGTH('dbo.AppUser','PasswordChangedAt') IS NULL ALTER TABLE dbo.AppUser ADD PasswordChangedAt datetime2 NULL;
IF COL_LENGTH('dbo.AppUser','PasswordVersion') IS NULL ALTER TABLE dbo.AppUser ADD PasswordVersion int NOT NULL CONSTRAINT DF_AppUser_PasswordVersion DEFAULT 0;
