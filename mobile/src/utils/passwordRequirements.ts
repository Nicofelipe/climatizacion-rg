export const passwordRequirementsMessage='Mínimo 8 caracteres, con mayúscula, minúscula y número. Puedes agregar símbolos.';
export function validNewPassword(value:string){
  let bytes=0;
  for(const character of value){const code=character.codePointAt(0)!;bytes+=code<=0x7f?1:code<=0x7ff?2:code<=0xffff?3:4;}
  return value.length>=8&&bytes<=72&&/[A-Z]/.test(value)&&/[a-z]/.test(value)&&/[0-9]/.test(value);
}
