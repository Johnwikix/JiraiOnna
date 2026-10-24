param([switch]$CpuOnly)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pythonPath = Join-Path $projectRoot '.local\art-venv\Scripts\python.exe'
$comfyRoot = Join-Path $projectRoot '.local\ComfyUI'
$modelsRoot = (Join-Path $projectRoot '.local\art-models') -replace '\\','/'
$configPath = Join-Path $projectRoot '.local\comfy-paths.yaml'
$oldModelsRoot = 'G:/AIsoftware/sd-webui'
@"
jirai_art:
  base_path: $modelsRoot
  diffusion_models: diffusion_models/
  text_encoders: text_encoders/
  vae: vae/
existing_animagine:
  base_path: $oldModelsRoot
  checkpoints: models/Stable-diffusion/
"@ | Set-Content -LiteralPath $configPath -Encoding utf8
$comfyArgs = @('main.py','--listen','127.0.0.1','--port','8188','--disable-all-custom-nodes','--extra-model-paths-config',$configPath,'--disable-auto-launch')
if($CpuOnly){$comfyArgs += '--cpu'}
Push-Location -LiteralPath $comfyRoot
try { & $pythonPath @comfyArgs } finally { Pop-Location }
