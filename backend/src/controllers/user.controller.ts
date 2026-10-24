import { Response } from 'express';

import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { createEmployee } from '../services/user.service';
import { validNewPassword,passwordRequirementsMessage } from '../utils/passwordRequirements';
import {normalizeRut} from '../utils/rut';

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
            role='EMPLOYEE',
        } = req.body;
        const rut=req.body.rut===undefined?undefined:normalizeRut(req.body.rut);
        if(rut===null){res.status(400).json({message:'Ingresa un RUT válido con dígito verificador.'});return;}
        if(role!=='EMPLOYEE'&&role!=='ADMIN'){res.status(400).json({message:'Selecciona trabajador o supervisor / administrador.'});return;}

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

        if (!validNewPassword(password)) {
            res.status(400).json({
                message:
                    passwordRequirementsMessage,
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
            role,
            rut,
            actorId:req.user.userId,
        });

        res.status(201).json({
            message: 'Employee created successfully',
            employee,
        });
    } catch (error) {
        if (
            error instanceof Error &&
            error.message.includes('EMAIL_ALREADY_EXISTS')
        ) {
            res.status(409).json({
                message: 'Email already exists',
            });
            return;
        }

        if(error instanceof Error&&error.message.includes('CREATE_USER_FORBIDDEN')){res.status(403).json({message:'Tu cuenta ya no tiene permiso para registrar integrantes.'});return;}

        console.error(
            'Create employee error:',
            error
        );

        res.status(500).json({
            message: 'Internal server error',
        });
    }
}
