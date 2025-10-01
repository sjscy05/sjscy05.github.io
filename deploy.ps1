# 网站部署脚本
# 使用方法：./deploy.ps1 "提交信息"

param(
    [string]$message = "更新网站内容"
)

Write-Host "🚀 开始部署网站..." -ForegroundColor Green

# 检查是否有未提交的更改
git status --porcelain
if ($LASTEXITCODE -eq 0) {
    Write-Host "📝 添加所有更改到暂存区..." -ForegroundColor Yellow
    git add .
    
    Write-Host "💾 提交更改..." -ForegroundColor Yellow
    git commit -m $message
    
    Write-Host "🌐 推送到GitHub..." -ForegroundColor Yellow
    git push origin master
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 部署成功！" -ForegroundColor Green
        Write-Host "🌍 网站地址: https://sjscy05.github.io" -ForegroundColor Cyan
        Write-Host "⏱️  更新可能需要5-10分钟生效" -ForegroundColor Yellow
    } else {
        Write-Host "❌ 推送失败，请检查网络连接" -ForegroundColor Red
    }
} else {
    Write-Host "ℹ️  没有检测到更改" -ForegroundColor Blue
}