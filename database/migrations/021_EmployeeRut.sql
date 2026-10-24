-- Additive: historical accounts remain intact until their RUT is recorded.
IF COL_LENGTH('dbo.AppUser','Rut') IS NULL
  ALTER TABLE dbo.AppUser ADD Rut nvarchar(12) NULL;
