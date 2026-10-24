export function isDriveAuthorizationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as { message?: string; response?: { data?: { error?: string } } };
  return value.message === 'invalid_grant' ||
    value.response?.data?.error === 'invalid_grant' ||
    value.message === 'Google Drive credentials were not found' ||
    value.message === 'Google Drive is not configured for this company';
}

// OAuth client errors contain request bodies with credentials. Never log those objects.
export function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown operation error';
}

export function driveUnavailableMessage(role: string): string {
  return role === 'ADMIN'
    ? 'El respaldo de la empresa no está disponible. Como administrador, puedes renovar el acceso desde Perfil → Conectar Google Drive. No necesitas cambiar la carpeta.'
    : 'El respaldo de tu empresa no está disponible temporalmente. Contacta al encargado para restablecerlo y luego vuelve a guardar tu boleta. No necesitas configurar Google Drive.';
}
