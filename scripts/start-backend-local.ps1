param([string]$NodePath='C:\Dev\tools\node24\node.exe')
$ErrorActionPreference='Stop'
if(!(Test-Path -LiteralPath $NodePath)){throw 'Instala Node 24 LTS o indica -NodePath con su ejecutable.'}
$taskNodeVersion=& $NodePath --version
if($taskNodeVersion -notmatch '^v24\.'){throw 'Este inicio requiere Node 24 LTS.'}
Push-Location (Join-Path (Split-Path $PSScriptRoot -Parent) 'backend')
try{& $NodePath --import tsx src/server.ts}finally{Pop-Location}
