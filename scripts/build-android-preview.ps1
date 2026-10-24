param(
  [Parameter(Mandatory=$true)][string]$ApiUrl,
  [string]$AndroidSdk = 'C:\Users\nicol\AppData\Local\Android\Sdk',
  [string]$JavaHome = 'C:\Program Files\Android\Android Studio\jbr',
  [ValidateSet('arm64-v8a','armeabi-v7a','x86_64','x86')][string]$Architecture = 'arm64-v8a'
)
$ErrorActionPreference = 'Stop'
$taskUri = [Uri]$ApiUrl
if ($taskUri.Scheme -ne 'https' -or $taskUri.AbsolutePath.TrimEnd('/') -ne '/api') {
  throw 'ApiUrl debe ser HTTPS y terminar en /api.'
}
if (!(Test-Path -LiteralPath "$AndroidSdk\platform-tools\adb.exe") -or !(Test-Path -LiteralPath "$JavaHome\bin\java.exe")) {
  throw 'Revisa AndroidSdk y JavaHome: faltan las herramientas de Android o Java.'
}
$taskRoot = Split-Path $PSScriptRoot -Parent
$taskPreviousApi = $env:EXPO_PUBLIC_API_URL
$taskPreviousSdk = $env:ANDROID_HOME
$taskPreviousJava = $env:JAVA_HOME
$taskPreviousNodeEnv = $env:NODE_ENV
try {
  $env:EXPO_PUBLIC_API_URL = $ApiUrl.TrimEnd('/')
  $env:ANDROID_HOME = $AndroidSdk
  $env:JAVA_HOME = $JavaHome
  $env:NODE_ENV = 'production'
  Push-Location (Join-Path $taskRoot 'mobile')
  try {
    npx expo prebuild --platform android --no-install
    if ($LASTEXITCODE -ne 0) { throw 'Fallo preparando Android.' }
    Push-Location android
    try {
      .\gradlew.bat assembleRelease --console=plain --max-workers=2 --no-daemon '-Dorg.gradle.jvmargs=-Xmx3072m -XX:MaxMetaspaceSize=1536m' "-PreactNativeArchitectures=$Architecture"
      if ($LASTEXITCODE -ne 0) { throw 'Fallo compilando la APK.' }
    } finally { Pop-Location }
  } finally { Pop-Location }
  $taskDestination = Join-Path $taskRoot 'artifacts'
  New-Item -ItemType Directory -Path $taskDestination -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $taskRoot 'mobile\android\app\build\outputs\apk\release\app-release.apk') -Destination (Join-Path $taskDestination 'climatizacion-rg-preview.apk')
  Write-Output 'APK de pruebas creada en artifacts/climatizacion-rg-preview.apk. Usa firma de desarrollo; no distribuir como version productiva.'
} finally {
  $env:EXPO_PUBLIC_API_URL = $taskPreviousApi
  $env:ANDROID_HOME = $taskPreviousSdk
  $env:JAVA_HOME = $taskPreviousJava
  $env:NODE_ENV = $taskPreviousNodeEnv
}
