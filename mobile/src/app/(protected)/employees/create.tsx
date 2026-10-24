import FormScrollView from '@/components/common/FormScrollView';
import { useState } from 'react';
import { Redirect, router } from 'expo-router';
import { Pressable,ScrollView, Text, View } from 'react-native';
import { createEmployeeApi } from '@/api/user.api';
import AppContainer from '@/components/layout/AppContainer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Spacing } from '@/theme';
import { validNewPassword,passwordRequirementsMessage } from '@/utils/passwordRequirements';
import ErrorBanner from '@/components/common/ErrorBanner';

export default function CreateEmployeeScreen() {
  const { user, token } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role,setRole]=useState<'EMPLOYEE'|'ADMIN'>('EMPLOYEE');
  const [confirmPassword,setConfirmPassword]=useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (user?.role !== 'ADMIN') return <Redirect href="/(protected)/(tabs)" />;

  async function submit() {
    if (!token || saving) return;
    setError(null);
    if (!firstName.trim() || !lastName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Completa nombre, apellido y un correo válido.');
      return;
    }
    if(!validNewPassword(password)){setError(passwordRequirementsMessage);return;}
    if(password!==confirmPassword){setError('Las contraseñas no coinciden. Revisa la confirmación.');return;}
    setSaving(true);
    try {
      await createEmployeeApi(token, { firstName: firstName.trim(), lastName: lastName.trim(),
        email: email.trim().toLowerCase(), password, phone: phone.trim() || undefined,role });
      setPassword('');
      setConfirmPassword('');
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible registrar al trabajador.');
    } finally { setSaving(false); }
  }

  return (
    <AppContainer>
      <FormScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: Spacing.md, paddingBottom: 32,width:'100%',maxWidth:560,alignSelf:'center' }}>
        <Text style={{ fontSize: 28, color: Colors.text, fontWeight: '700' }}>Registrar integrante</Text>
        {success ? (
          <View style={{ gap: Spacing.lg }}>
            <Text accessibilityRole="alert" style={{ color: Colors.success }}>Integrante registrado correctamente como {role==='ADMIN'?'supervisor / administrador':'trabajador'}.</Text>
            <Text style={{ color: Colors.text }}>{email.trim().toLowerCase()} ya puede ingresar con su correo y contraseña. Comparte el acceso por un canal privado.</Text>
            <Button title="Volver a mi cuenta" onPress={() => router.replace('/(protected)/(tabs)/profile')} />
          </View>
        ) : (
          <>
            <Text style={{ color: Colors.textSecondary }}>La cuenta quedará vinculada a tu empresa con el rol seleccionado.</Text>
            <Input label="Nombre" value={firstName} onChangeText={setFirstName} />
            <Input label="Apellido" value={lastName} onChangeText={setLastName} />
            <Input label="Correo de acceso" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="nombre@empresa.cl" />
            <Text style={{color:Colors.text,fontWeight:'600'}}>Rol</Text><View style={{gap:8}}>{([{value:'EMPLOYEE',label:'Trabajador'},{value:'ADMIN',label:'Supervisor / administrador'}] as const).map(item=><Pressable key={item.value} accessibilityRole="radio" accessibilityState={{checked:role===item.value}} onPress={()=>setRole(item.value)} style={{padding:13,borderRadius:12,borderWidth:1,borderColor:role===item.value?Colors.primary:Colors.border,backgroundColor:role===item.value?'#E5F5EF':'white'}}><Text style={{color:role===item.value?Colors.primary:Colors.text,fontWeight:'600'}}>{role===item.value?'●':'○'} {item.label}</Text></Pressable>)}</View>
            {role==='ADMIN'?<Text style={{color:'#A16207',fontSize:12,lineHeight:20}}>Podrá revisar boletas y gestionar personas de tu empresa. Al existir varios administradores activos, cada uno necesitará que otro apruebe sus propias boletas.</Text>:null}
            <Input label="Contraseña inicial (mínimo 8 caracteres)" value={password} onChangeText={value=>{setPassword(value);setError(null);}} secureTextEntry />
            <Text style={{color:Colors.textSecondary,fontSize:12,lineHeight:19}}>{passwordRequirementsMessage}</Text>
            <Input label="Repite la contraseña inicial" value={confirmPassword} onChangeText={value=>{setConfirmPassword(value);setError(null);}} secureTextEntry/>
            {confirmPassword&&password!==confirmPassword?<ErrorBanner message="Las contraseñas no coinciden. Revisa la confirmación."/>:null}
            <Text style={{color:Colors.textSecondary,fontSize:12,lineHeight:20}}>El trabajador tendrá 48 horas desde su primer acceso para reemplazar esta contraseña. El plazo queda registrado y no se reinicia al cerrar sesión.</Text>
            <Input label="Teléfono (opcional)" value={phone} onChangeText={setPhone} />
            {error&&!(confirmPassword&&password!==confirmPassword)?<ErrorBanner message={error}/>:null}
            <Button title="Crear acceso" onPress={submit} loading={saving} />
            <Button title="Volver" onPress={() => router.back()} disabled={saving} />
          </>
        )}
      </FormScrollView>
    </AppContainer>
  );
}
