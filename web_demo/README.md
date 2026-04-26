# Flask 网页项目演示

本项目为一个简单的 Flask + 前端静态文件的网页演示。

## 结构说明
- `app.py`：Flask 后端主程序
- `requirements.txt`：依赖包清单
- `templates/`：HTML 模板文件
- `static/`：静态资源（CSS、JS）

## 本地运行
1. 安装依赖：
   ```bash
   pip install -r requirements.txt
   ```
2. 启动服务：
   ```bash
   python app.py
   ```
3. 浏览器访问：`http://127.0.0.1:5000`

## 部署到 GitHub
1. 推送本项目到你的 GitHub 仓库。
2. 推荐添加 `.gitignore` 文件，避免上传无关文件。
3. 可结合 GitHub Actions 自动化部署（如需部署到云平台，可补充相关配置）。

## 其他说明
- 如需云部署（如 Vercel、Heroku），请补充 `Procfile` 或相关配置。
