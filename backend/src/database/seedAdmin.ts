/**
 * Crea la primera empresa y su administrador en una instalación nueva. No modifica cuentas existentes.
 * Usa COMPANY_SEED_NAME, COMPANY_SEED_RUT y ADMIN_SEED_FIRST_NAME / LAST_NAME / EMAIL / PASSWORD.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { executeQuery } from './sqlServer';
import { validNewPassword, passwordRequirementsMessage } from '../utils/passwordRequirements';

async function seedAdmin() {
  const { ADMIN_SEED_FIRST_NAME: firstName, ADMIN_SEED_LAST_NAME: lastName, ADMIN_SEED_EMAIL: email, ADMIN_SEED_PASSWORD: password,
    COMPANY_SEED_NAME: companyName, COMPANY_SEED_RUT: companyRut } = process.env;
  if (!firstName || !lastName || !email || !password) throw new Error('Faltan las variables ADMIN_SEED_*.');
  if (!validNewPassword(password)) throw new Error(passwordRequirementsMessage);
  const address = email.trim().toLowerCase();
  if ((await executeQuery('SELECT Id FROM dbo.AppUser WHERE Email=?;', [address])).length) { console.log('Ese correo ya tiene una cuenta; no se cambió nada.'); return; }

  let [company] = await executeQuery<{ Id: number }>('SELECT TOP 1 Id FROM dbo.Company WHERE IsActive=1 ORDER BY Id;');
  if (!company) {
    if (!companyName || !companyRut) throw new Error('La base no tiene empresas: define COMPANY_SEED_NAME y COMPANY_SEED_RUT.');
    [company] = await executeQuery<{ Id: number }>('INSERT INTO dbo.Company(Name,Rut) OUTPUT INSERTED.Id VALUES(?,?);', [companyName, companyRut]);
  }
  const hash = await bcrypt.hash(password, 12);
  await executeQuery(`INSERT INTO dbo.AppUser(CompanyId,RoleId,FirstName,LastName,Email,PasswordHash,MustChangePassword)
    SELECT ?,Id,?,?,?,?,1 FROM dbo.Role WHERE Name=N'ADMIN' AND IsActive=1;`, [company.Id, firstName.trim(), lastName.trim(), address, hash]);
  console.log('Administrador creado. Deberá cambiar su contraseña en las primeras 48 horas.');
}

seedAdmin().catch(error => { console.error('No fue posible crear el administrador:', error instanceof Error ? error.message : error); process.exitCode = 1; });
