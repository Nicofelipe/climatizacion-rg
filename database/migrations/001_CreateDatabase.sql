USE master;
GO

IF DB_ID('ClimatizacionRG') IS NULL
BEGIN
    CREATE DATABASE ClimatizacionRG;
END
GO