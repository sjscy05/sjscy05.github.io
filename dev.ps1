# 开发辅助脚本
# 使用方法：./dev.ps1 [command]
# 命令: start, deploy, status, preview, help

param(
    [string]$command = "help",
    [string]$message = ""
)

function Show-Help {
    Write-Host "🛠️  个人网站开发工具" -ForegroundColor Cyan
    Write-Host "===============================================" -ForegroundColor Gray
    Write-Host "使用方法: ./dev.ps1 [命令]" -ForegroundColor White
    Write-Host ""
    Write-Host "可用命令:" -ForegroundColor Yellow
    Write-Host "  start    - 启动本地开发服务器" -ForegroundColor Green
    Write-Host "  preview  - 打开本地预览和线上网站" -ForegroundColor Green
    Write-Host "  status   - 查看git状态和更改" -ForegroundColor Green
    Write-Host "  deploy   - 提交并部署到GitHub" -ForegroundColor Green
    Write-Host "  help     - 显示此帮助信息" -ForegroundColor Green
    Write-Host ""
    Write-Host "示例:" -ForegroundColor Yellow
    Write-Host "  ./dev.ps1 start" -ForegroundColor Gray
    Write-Host "  ./dev.ps1 deploy" -ForegroundColor Gray
    Write-Host "  ./dev.ps1 deploy '修复样式问题'" -ForegroundColor Gray
}

function Start-DevServer {
    Write-Host "🚀 启动本地开发服务器..." -ForegroundColor Green
    Write-Host "📂 切换到web_demo目录..." -ForegroundColor Yellow
    
    if (Test-Path "web_demo") {
        Set-Location "web_demo"
        Write-Host "🌍 服务器将在 http://127.0.0.1:5000 启动" -ForegroundColor Cyan
        Write-Host "💡 按 Ctrl+C 停止服务器" -ForegroundColor Yellow
        Write-Host "===============================================" -ForegroundColor Gray
        python app.py
    } else {
        Write-Host "❌ 找不到web_demo目录" -ForegroundColor Red
    }
}

function Show-Status {
    Write-Host "📋 检查项目状态..." -ForegroundColor Green
    Write-Host ""
    
    Write-Host "🔍 Git状态:" -ForegroundColor Yellow
    git status --short
    
    Write-Host ""
    Write-Host "📊 提交历史 (最近5条):" -ForegroundColor Yellow
    git log --oneline -5
    
    Write-Host ""
    Write-Host "🌐 远程仓库:" -ForegroundColor Yellow
    git remote -v
}

function Open-Preview {
    Write-Host "🌍 打开预览..." -ForegroundColor Green
    
    # 检查本地服务器是否运行
    $process = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object {
        $_.ProcessName -eq "python" -and $_.MainWindowTitle -like "*flask*"
    }
    
    if ($process) {
        Write-Host "✅ 本地服务器正在运行" -ForegroundColor Green
        Write-Host "🔗 本地预览: http://127.0.0.1:5000" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  本地服务器未运行，使用 './dev.ps1 start' 启动" -ForegroundColor Yellow
    }
    
    Write-Host "🔗 线上网站: https://sjscy05.github.io" -ForegroundColor Cyan
    
    # 尝试打开浏览器
    try {
        Start-Process "http://127.0.0.1:5000"
        Start-Process "https://sjscy05.github.io"
        Write-Host "✅ 已在浏览器中打开预览" -ForegroundColor Green
    } catch {
        Write-Host "💡 请手动在浏览器中打开上述链接" -ForegroundColor Yellow
    }
}

function Deploy-Website {
    param([string]$commitMessage)
    
    if (-not $commitMessage) {
        $commitMessage = Read-Host "请输入提交信息 (直接回车使用默认信息)"
        if (-not $commitMessage) {
            $commitMessage = "更新网站内容 - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
        }
    }
    
    Write-Host "🚀 开始部署网站..." -ForegroundColor Green
    Write-Host "📝 提交信息: $commitMessage" -ForegroundColor Cyan
    Write-Host ""
    
    # 检查是否有更改
    $changes = git status --porcelain
    if (-not $changes) {
        Write-Host "ℹ️  没有检测到更改，无需部署" -ForegroundColor Blue
        return
    }
    
    Write-Host "📋 发现以下更改:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    
    # 确认部署
    $confirm = Read-Host "确认部署？(Y/n)"
    if ($confirm -and $confirm.ToLower() -ne "y" -and $confirm.ToLower() -ne "yes") {
        Write-Host "❌ 部署已取消" -ForegroundColor Red
        return
    }
    
    # 执行部署
    Write-Host "📝 添加更改到暂存区..." -ForegroundColor Yellow
    git add .
    
    Write-Host "💾 提交更改..." -ForegroundColor Yellow
    git commit -m $commitMessage
    
    Write-Host "🌐 推送到GitHub..." -ForegroundColor Yellow
    git push origin master
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ 部署成功！" -ForegroundColor Green
        Write-Host "🌍 网站地址: https://sjscy05.github.io" -ForegroundColor Cyan
        Write-Host "⏱️  更新将在5-10分钟内生效" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "💡 提示: 使用 './dev.ps1 preview' 查看更新效果" -ForegroundColor Blue
    } else {
        Write-Host ""
        Write-Host "❌ 部署失败，请检查网络连接或Git配置" -ForegroundColor Red
    }
}

# 主逻辑
switch ($command.ToLower()) {
    "start" { Start-DevServer }
    "status" { Show-Status }
    "preview" { Open-Preview }
    "deploy" { Deploy-Website $message }
    "help" { Show-Help }
    default { 
        Write-Host "❌ 未知命令: $command" -ForegroundColor Red
        Write-Host ""
        Show-Help 
    }
}