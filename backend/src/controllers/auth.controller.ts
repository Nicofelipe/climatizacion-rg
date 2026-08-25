import { Request, Response } from 'express';

import { loginService } from '../services/auth.service';

export async function loginController(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        message: 'Email and password are required',
      });
      return;
    }

    const user = await loginService(email, password);

    res.status(200).json({
      message: 'Login successful',
      user,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'INVALID_CREDENTIALS'
    ) {
      res.status(401).json({
        message: 'Correo o contraseña incorrectos',
      });
      return;
    }

    console.error('Login error:', error);

    res.status(500).json({
      message: 'Internal server error',
    });
  }
}