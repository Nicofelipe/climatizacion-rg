import { Response } from 'express';

import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { createEmployee } from '../services/user.service';

export async function createEmployeeController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.user) {
            res.status(401).json({
                message: 'Authentication required',
            });
            return;
        }

        if (req.user.role !== 'ADMIN') {
            res.status(403).json({ message: 'Solo el administrador puede registrar trabajadores' });
            return;
        }

        const {
            firstName,
            lastName,
            email,
            password,
            phone,
        } = req.body;

        if (
            typeof firstName !== 'string' ||
            !firstName.trim() ||
            typeof lastName !== 'string' ||
            !lastName.trim() ||
            typeof email !== 'string' ||
            !email.trim() ||
            typeof password !== 'string' ||
            !password
        ) {
            res.status(400).json({
                message: 'Missing required fields',
            });
            return;
        }

        if (password.length < 8) {
            res.status(400).json({
                message:
                    'Password must contain at least 8 characters',
            });
            return;
        }

        if (firstName.trim().length > 100 || lastName.trim().length > 100 ||
            email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
            Buffer.byteLength(password, 'utf8') > 72 ||
            (phone != null && (typeof phone !== 'string' || phone.length > 30))) {
            res.status(400).json({ message: 'Revisa el correo, los nombres, el teléfono y la contraseña (máximo 72 bytes)' });
            return;
        }

        const employee = await createEmployee({
            companyId: req.user.companyId,
            firstName,
            lastName,
            email,
            password,
            phone,
        });

        res.status(201).json({
            message: 'Employee created successfully',
            employee,
        });
    } catch (error) {
        if (
            error instanceof Error &&
            error.message === 'EMAIL_ALREADY_EXISTS'
        ) {
            res.status(409).json({
                message: 'Email already exists',
            });
            return;
        }

        console.error(
            'Create employee error:',
            error
        );

        res.status(500).json({
            message: 'Internal server error',
        });
    }
}
