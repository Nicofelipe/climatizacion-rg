export const passwordRequirementsMessage='Usa al menos 8 caracteres, con mayúscula, minúscula y número (máximo 72 bytes).';
export function validNewPassword(value:unknown):value is string{
  return typeof value==='string'&&value.length>=8&&Buffer.byteLength(value,'utf8')<=72&&/[A-Z]/.test(value)&&/[a-z]/.test(value)&&/[0-9]/.test(value);
}
