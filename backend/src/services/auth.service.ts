import bcrypt from 'bcryptjs';
import { executeQuery } from '../database/sqlServer';
import { passwordSession, recordSuccessfulLogin } from './passwordPolicy.service';

// Mismo costo que una clave real, para que un correo desconocido no responda más rápido.
const dummyHash = bcrypt.hashSync('unregistered-account-placeholder', 12);
const MAX_ACCOUNTS = 5;

interface LoginUserRow {
  Id: number; CompanyId: number; CompanyName: string; FirstName: string; LastName: string;
  Email: string; PasswordHash: string; IsActive: boolean; RoleName: string;
}

/** El mismo correo y clave abre más de una empresa: la persona debe elegir a cuál entrar. */
export class CompanySelectionError extends Error {
  constructor(public companies: { id: number; name: string }[]) { super('COMPANY_SELECTION_REQUIRED'); }
}

export async function loginService(email: string, password: string, companyId?: number) {
  const users = await executeQuery<LoginUserRow>(`
      SELECT u.Id,u.CompanyId,c.Name AS CompanyName,u.FirstName,u.LastName,u.Email,u.PasswordHash,u.IsActive,r.Name AS RoleName
      FROM dbo.AppUser AS u
      INNER JOIN dbo.Role AS r ON r.Id=u.RoleId
      INNER JOIN dbo.Company AS c ON c.Id=u.CompanyId
      WHERE u.Email=? AND r.IsActive=1 AND c.IsActive=1;`, [email]);
  const candidates = users.slice(0, MAX_ACCOUNTS);
  if (!candidates.length) {
    await bcrypt.compare(password, dummyHash);
    throw new Error('INVALID_CREDENTIALS');
  }
  const matches: LoginUserRow[] = [];
  for (const user of candidates) if (await bcrypt.compare(password, user.PasswordHash)) matches.push(user);
  const allowed = matches.filter(user => companyId === undefined || user.CompanyId === companyId);
  if (!allowed.length) throw new Error('INVALID_CREDENTIALS');
  const active = allowed.filter(user => user.IsActive);
  if (!active.length) throw new Error('ACCOUNT_INACTIVE');
  if (active.length > 1) throw new CompanySelectionError(active.map(user => ({ id: user.CompanyId, name: user.CompanyName })));
  const user = active[0];
  const account = await recordSuccessfulLogin(user.CompanyId, user.Id, 'PASSWORD');
  if (account.PasswordHash !== user.PasswordHash) throw new Error('INVALID_CREDENTIALS');
  return passwordSession(account);
}
