param([Parameter(Mandatory=$true)][string]$Email)
$ErrorActionPreference='Stop'
if($Email -notmatch '^[A-Za-z0-9._%+-]+@gmail\.com$'){throw 'Indica una cuenta Gmail válida.'}
$repoRoot=Split-Path -Parent $PSScriptRoot
$envPath=Join-Path $repoRoot 'backend/.env'
if(-not(Test-Path -LiteralPath $envPath)){throw 'No se encontró backend/.env. Configura primero el backend.'}
Write-Host 'Usa la contraseña de aplicación de Google de 16 caracteres, no tu contraseña habitual.'
$secret=Read-Host 'Contraseña de aplicación (entrada oculta)' -AsSecureString
$pointer=[IntPtr]::Zero
try {
  $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  $appPassword=([Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) -replace '\s','')
  if($appPassword -notmatch '^[A-Za-z]{16}$'){throw 'La contraseña de aplicación debe tener 16 letras; los espacios se quitan automáticamente.'}
  $settings=[ordered]@{SMTP_HOST='smtp.gmail.com';SMTP_PORT='587';SMTP_SECURE='false';SMTP_USER=$Email.ToLowerInvariant();SMTP_FROM=$Email.ToLowerInvariant();SMTP_PASSWORD=$appPassword}
  $envText=[IO.File]::ReadAllText($envPath)
  if($envText -notmatch '(?m)^PASSWORD_RESET_URL=.+'){$settings['PASSWORD_RESET_URL']='http://localhost:8081/reset-password'}
  foreach($setting in $settings.GetEnumerator()){
    $pattern='(?m)^'+[regex]::Escape($setting.Key)+'=.*$'
    $line=$setting.Key+'='+$setting.Value
    if([regex]::IsMatch($envText,$pattern)){$envText=[regex]::Replace($envText,$pattern,[System.Text.RegularExpressions.MatchEvaluator]{param($match) $line})}
    else{$envText=$envText.TrimEnd()+[Environment]::NewLine+$line+[Environment]::NewLine}
  }
  [IO.File]::WriteAllText($envPath,$envText)
  Write-Host 'Configuración guardada únicamente en backend/.env. No se ha enviado ningún correo.'
  Write-Host 'Reinicia el backend y prueba Olvidé mi contraseña con una cuenta registrada.'
} finally {
  if($pointer -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)}
  $secret.Dispose();$appPassword=$null;$envText=$null;$settings=$null
}
