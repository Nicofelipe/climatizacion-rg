import { Request, Response } from 'express';
import { CompanySelectionError, loginService } from '../services/auth.service';

export async function loginController(req: Request, res: Response) {
  try {
    const { email, password, companyId } = req.body ?? {};
    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password ||
        email.length > 254 || Buffer.byteLength(password, 'utf8') > 72 ||
        (companyId !== undefined && (!Number.isSafeInteger(companyId) || companyId <= 0))) {
      res.status(400).json({ message: 'Escribe tu correo y tu contraseña.' });
      return;
    }
    const result = await loginService(email.trim().toLowerCase(), password, companyId);
    res.status(200).json({ message: 'Login successful', user: result.user, token: result.token });
  } catch (error) {
    if (error instanceof CompanySelectionError) {
      res.status(409).json({ code: 'COMPANY_SELECTION_REQUIRED', message: 'Tu correo está registrado en más de una empresa. Elige a cuál quieres entrar.', companies: error.companies });
      return;
    }
    const code = error instanceof Error ? error.message : '';
    if (code === 'ACCOUNT_INACTIVE') {
      res.status(403).json({ message: 'Tu cuenta fue dada de baja. No tienes autorización para acceder. Contacta al administrador de tu empresa.' });
      return;
    }
    if (code === 'INVALID_CREDENTIALS') { res.status(401).json({ message: 'Correo o contraseña incorrectos' }); return; }
    console.error('Login operation failed');
    res.status(500).json({ message: 'No fue posible iniciar sesión. Inténtalo nuevamente.' });
  }
}
