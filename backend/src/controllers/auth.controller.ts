import { Request, Response } from 'express';

import { loginService } from '../services/auth.service';

export async function loginController(req: Request, res: Response) {
  try {
    const { email, password } = req.body??{};

    if (typeof email !== 'string' || !email.trim() ||
        typeof password !== 'string' || !password ||
        email.length > 254 || Buffer.byteLength(password, 'utf8') > 72) {
      res.status(400).json({
        message: 'Email and password are required',
      });
      return;
    }

    const result = await loginService(email.trim().toLowerCase(), password);

    res.status(200).json({
      message: 'Login successful',
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    if(error instanceof Error&&error.message==='ACCOUNT_INACTIVE'){
      res.status(403).json({message:'Tu cuenta fue dada de baja. No tienes autorización para acceder. Contacta al administrador de tu empresa.'});return;
    }
    if (
      error instanceof Error &&
      error.message === 'INVALID_CREDENTIALS'
    ) {
      res.status(401).json({
        message: 'Correo o contraseña incorrectos',
      });
      return;
    }

    console.error('Login operation failed');

    res.status(500).json({
      message: 'Internal server error',
    });
  }
}
