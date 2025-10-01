# Git操作常用命令备忘

## 📥 同步远程更改到本地
```powershell
# 获取远程仓库最新状态
git fetch origin

# 合并远程更改到本地
git pull origin master
```

## 📤 提交本地更改到远程
```powershell
# 查看文件状态
git status

# 添加所有更改
git add .

# 提交更改（附带说明信息）
git commit -m "描述你的更改内容"

# 推送到远程仓库
git push origin master
```

## 🔄 完整工作流程
1. **开发前同步**: `git pull origin master`
2. **本地开发**: 修改代码并在 http://127.0.0.1:5000 预览
3. **提交更改**: `git add . && git commit -m "更新说明"`
4. **推送部署**: `git push origin master`
5. **验证网站**: 访问 https://sjscy05.github.io 确认更新

## 🚨 注意事项
- 每次开发前先执行 `git pull` 同步远程更改
- 提交信息要清晰描述本次更改内容
- GitHub Pages 更新可能需要5-10分钟
- 重要更改前建议创建分支保护主代码