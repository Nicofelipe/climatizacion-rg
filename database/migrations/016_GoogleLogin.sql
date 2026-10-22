IF COL_LENGTH('dbo.AppUser','GoogleSubject') IS NULL
  ALTER TABLE dbo.AppUser ADD GoogleSubject nvarchar(255) NULL;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.AppUser') AND name='UX_AppUser_GoogleSubject')
  EXEC(N'CREATE UNIQUE INDEX UX_AppUser_GoogleSubject ON dbo.AppUser(GoogleSubject) WHERE GoogleSubject IS NOT NULL;');
