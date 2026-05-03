# 在本目录打开终端运行: .\push-github.ps1
# 可选提交说明: .\push-github.ps1 "feat: 某功能"
$ErrorActionPreference = "Stop"
$repoRoot = git -C $PSScriptRoot rev-parse --show-toplevel 2>$null
if (-not $repoRoot) { Write-Error "未找到 git 仓库根目录"; exit 1 }
Set-Location $repoRoot
git add Dean_simulator/
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "没有需要提交的变更。"
    exit 0
}
$msg = if ($args[0]) { $args[0] } else { "chore: 同步院长模拟器" }
git commit -m $msg
git push origin main
Write-Host "已推送到 GitHub。"
