# OpenStock 部署成功！

## 🎉 部署状态

✅ **部署成功！** OpenStock 已成功部署到您的服务器。

## 📍 访问信息

您可以通过以下地址访问 OpenStock 应用：

- **本地访问**: http://localhost:3000
- **网络访问**: http://192.168.99.20:3000

## 🔧 当前配置

### 服务状态
- ✅ MongoDB: 运行中 (端口 27017)
- ✅ OpenStock: 运行中 (端口 3000)

### 数据库连接
- MongoDB URI: `mongodb://root:example@mongodb:27017/openstock?authSource=admin`
- 用户名: root
- 密码: example

## ⚠️ 重要提示

### 需要配置的 API 密钥

当前 `.env` 文件中使用的是占位符值，您需要替换以下 API 密钥才能使用完整功能：

1. **BETTER_AUTH_SECRET**: 生成一个随机字符串
   ```bash
   openssl rand -base64 32
   ```

2. **NEXT_PUBLIC_FINNHUB_API_KEY**: 从 https://finnhub.io/ 获取
   - 注册账号
   - 获取免费 API 密钥

3. **GEMINI_API_KEY**: 从 Google AI Studio 获取
   - 访问 https://makersuite.google.com/app/apikey
   - 创建 API 密钥

4. **INNGEST_SIGNING_KEY**: 从 Inngest 获取
   - 访问 https://app.inngest.com/
   - 在设置中获取签名密钥

5. **NODEMAILER_EMAIL** 和 **NODEMAILER_PASSWORD**: Gmail 凭据
   - 使用您的 Gmail 地址
   - 如果启用了 2FA，需要使用应用专用密码

### 更新环境变量

编辑 `/root/stock/.env` 文件并替换占位符值：

```bash
nano /root/stock/.env
```

更新后重启应用：

```bash
cd /root/stock
docker compose restart openstock
```

## 📊 常用命令

### 查看服务状态
```bash
cd /root/stock
docker compose ps
```

### 查看应用日志
```bash
docker compose logs -f openstock
```

### 查看 MongoDB 日志
```bash
docker compose logs -f mongodb
```

### 重启应用
```bash
docker compose restart openstock
```

### 停止所有服务
```bash
docker compose down
```

### 启动所有服务
```bash
docker compose up -d
```

### 重新构建并启动
```bash
docker compose up -d --build
```

## 🗂️ 项目结构

```
/root/stock/
├── .env                    # 环境变量配置
├── docker-compose.yml      # Docker Compose 配置
├── Dockerfile             # Docker 镜像配置
├── app/                   # Next.js 应用代码
├── components/            # React 组件
├── database/              # 数据库模型
├── lib/                   # 工具库和操作
└── .agent/workflows/      # 部署工作流文档
```

## 🔐 安全建议

1. **更改默认密码**: MongoDB 当前使用默认密码 `example`，建议在生产环境中更改
2. **配置防火墙**: 确保只有必要的端口对外开放
3. **使用 HTTPS**: 在生产环境中配置 SSL/TLS 证书
4. **定期备份**: 设置 MongoDB 数据的定期备份

## 📚 更多信息

- 项目文档: /root/stock/README.md
- 部署工作流: /root/stock/.agent/workflows/deploy.md
- GitHub 仓库: https://github.com/Open-Dev-Society/OpenStock

## 🆘 故障排除

如果遇到问题，请检查：

1. 容器状态: `docker compose ps`
2. 应用日志: `docker compose logs openstock`
3. MongoDB 日志: `docker compose logs mongodb`
4. 环境变量配置: `cat .env`

---

**部署时间**: 2026-01-25
**服务器**: 192.168.99.20
**部署路径**: /root/stock
