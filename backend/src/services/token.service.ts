import jwt from 'jsonwebtoken';

interface TokenPayload {
  userId: number;
  companyId: number;
  role: string;
}

export function generateAccessToken(payload: TokenPayload) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const expiresIn =
    (process.env.JWT_EXPIRES_IN ?? '8h') as jwt.SignOptions['expiresIn'];

  return jwt.sign(payload, secret, {
    expiresIn,
  });
}