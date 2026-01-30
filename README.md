<div align="center">
  查看更多精彩项目，我们的 <a href="github.com/open-dev-society/openreadme" target="_blank">OpenReadme </a> 已上线
</div>  
<a href="https://hellogithub.com/repository/Open-Dev-Society/OpenStock" target="_blank"><img src="https://abroad.hellogithub.com/v1/widgets/recommend.svg?rid=5c4337a9e2dd4a8ba8aba87a88f04b8b&claim_uid=07HezcXv9puSGKQ&theme=neutral" alt="Featured｜HelloGitHub" style="width: 250px; height: 54px;" width="250" height="54" /></a>
<div align="center">
  <br />
  <a href="#" target="_blank">
    <img src="./public/assets/images/dashboard.png" alt="项目横幅" />
  </a>
  © Open Dev Society。本项目根据 AGPL-3.0 许可证授权；如果您修改、重新分发或部署本项目（包括作为 Web 服务），您必须根据相同的许可证发布源代码并注明原作者。
  <br />
  <br/>

  <div>
    <img src="https://img.shields.io/badge/-Next.js-black?style=for-the-badge&logoColor=white&logo=next.js&color=000000" alt="Next.js 徽章" />
    <img src="https://img.shields.io/badge/-TypeScript-black?style=for-the-badge&logoColor=white&logo=typescript&color=3178C6"/>
    <img src="https://img.shields.io/badge/-Tailwind%20CSS-black?style=for-the-badge&logoColor=white&logo=tailwindcss&color=38B2AC"/>
    <img src="https://img.shields.io/badge/-shadcn/ui-black?style=for-the-badge&logoColor=white&logo=shadcnui&color=000000"/>
    <img src="https://img.shields.io/badge/-Radix%20UI-black?style=for-the-badge&logoColor=white&logo=radixui&color=000000"/>
    <img src="https://img.shields.io/badge/-Better%20Auth-black?style=for-the-badge&logoColor=white&logo=betterauth&color=000000"/>
    <img src="https://img.shields.io/badge/-MongoDB-black?style=for-the-badge&logoColor=white&logo=mongodb&color=00A35C"/>
    <img src="https://img.shields.io/badge/-Inngest-black?style=for-the-badge&logoColor=white&logo=inngest&color=000000"/>
    <img src="https://img.shields.io/badge/-Nodemailer-black?style=for-the-badge&logoColor=white&logo=gmail&color=EA4335"/>
    <img src="https://img.shields.io/badge/-TradingView-black?style=for-the-badge&logoColor=white&logo=tradingview&color=2962FF"/>
    <img src="https://img.shields.io/badge/-Finnhub-black?style=for-the-badge&logoColor=white&color=30B27A"/>
    <img src="https://img.shields.io/badge/-CodeRabbit-black?style=for-the-badge&logoColor=white&logo=coderabbit&color=9146FF"/>
  </div>
</div>

# OpenStock

OpenStock 是昂贵市场平台的开源替代方案。实时追踪价格，设置个性化提醒，并探索详细的公司见解——公开构建，人人可用，永久免费。

注意：OpenStock 由社区构建，并非经纪商。市场数据可能会根据提供商规则和您的配置而有所延迟。此处内容不构成财务建议。

## 📋 目录

1. ✨ [介绍](#introduction)
2. 🌍 [Open Dev Society 宣言](#manifesto)
3. ⚙️ [技术栈](#tech-stack)
4. 🔋 [功能特性](#features)
5. 🤸 [快速入门](#quick-start)
6. 🐳 [Docker 安装](#docker-setup)
7. 🔐 [环境变量](#environment-variables)
8. 🧱 [项目结构](#project-structure)
9. 📡 [数据与集成](#data--integrations)
10. 🧪 [脚本与工具](#scripts--tooling)
11. 🤝 [贡献指南](#contributing)
12. 🛡️ [安全建议](#security)
13. 📜 [许可证](#license)
14. 🙏 [致谢](#acknowledgements)

## ✨ 介绍

OpenStock 是一款现代股票 market 应用，由 Next.js (App Router)、shadcn/ui 和 Tailwind CSS 驱动，使用 Better Auth 进行身份验证，MongoDB 进行数据持久化，Finnhub 提供市场数据，并使用 TradingView 小部件显示图表和市场视图。

## 🌍 Open Dev Society 宣言 <a name="manifesto"></a>

我们生活在一个知识被付费墙阻挡的世界。工具被锁定在订阅中。信息被偏见扭曲。新手被告知他们不够“优秀”来构建东西。

我们相信有更好的方式。

- 我们的信念：技术应该属于每个人。知识应该是开放、免费且易于获取的。社区应该带着信任欢迎新手，而不是设置门槛。
- 我们的使命：建立能带来真正改变的免费开源项目：
    - 专业人士和学生可以无障碍使用的工具。
    - 学习永久免费的知识平台。
    - 指导而非审判新手的社区。
    - 运行在信任而非利润之上的资源。
- 我们的承诺：我们绝不会锁定知识。我们绝不会对访问收费。我们绝不会用信任换取金钱。我们运行在透明、捐赠和社区的力量之上。
- 我们的呼吁：如果您曾感到自己不属于这里，难以找到免费资源，或者想构建有意义的东西——欢迎加入我们。

因为未来属于那些公开构建它的人。

## ⚙️ 技术栈

核心
- Next.js 15 (App Router), React 19
- TypeScript
- Tailwind CSS v4 (通过 @tailwindcss/postcss)
- shadcn/ui + Radix UI 原语
- Lucide 图标

认证与数据
- Better Auth (邮箱/密码) 配合 MongoDB 适配器
- MongoDB + Mongoose
- Finnhub API 用于股票代码、档案和市场新闻
- TradingView 可嵌入小部件

自动化与通信
- Inngest (事件、定时任务、通过 Gemini 进行 AI 推理)
- Nodemailer (Gmail 传输)
- next-themes, cmdk (命令面板), react-hook-form

语言构成
- TypeScript (~93.4%), CSS (~6%), JavaScript (~0.6%)

## 🔋 功能特性

- 身份验证
    - 使用 Better Auth + MongoDB 适配器进行邮箱/密码验证
    - 通过 Next.js 中间件强制执行受保护路由
- 全局搜索和 Command + K 面板
    - 由 Finnhub 支持的快速股票搜索
    - 空闲时显示热门股票；防抖查询
- 自选列表 (Watchlist)
    - 存储在 MongoDB 中的每个用户的自选列表（每个用户唯一的股票代码）
- 股票详情
    - TradingView 股票代码信息、蜡烛图/高级图表、基准线、技术分析
    - 公司简介和财务数据小部件
- 市场概览
    - 热力图、报价和热门动态（TradingView 小部件）
- 个性化引导 (Onboarding)
    - 收集国家、投资目标、风险承受能力、偏好行业
- 邮件与自动化
    - AI 个性化欢迎邮件（通过 Inngest 使用 Gemini）
    - 使用用户自选列表个性化的每日新闻摘要邮件（定时任务）
- 优雅的 UI
    - shadcn/ui 组件、Radix 原语、Tailwind v4 设计令牌
    - 默认暗黑主题
- 键盘快捷键
    - Cmd/Ctrl + K 用于快速操作/搜索

## 🤸 快速入门

准备工作
- Node.js 20+ 以及 pnpm 或 npm
- MongoDB 连接字符串（MongoDB Atlas 或通过 Docker Compose 本地部署）
- Finnhub API 密钥（支持免费套餐；实时数据可能需要付费）
- 用于发送邮件的 Gmail 账户（或更新 Nodemailer 传输配置）
- 可选：Google Gemini API 密钥（用于生成 AI 欢迎词）

克隆与安装
```bash
git clone https://github.com/Open-Dev-Society/OpenStock.git
cd OpenStock

# 选择一个:
pnpm install
# 或
npm install
```

配置环境
- 创建 `.env` 文件（参见 [环境变量](#environment-variables)）。
- 验证数据库连接：
```bash
pnpm test:db
# 或
npm run test:db
```

运行开发模式
```bash
# Next.js 开发服务 (Turbopack)
pnpm dev
# 或
npm run dev
```

本地运行 Inngest（工作流、定时任务、AI）
```bash
npx inngest-cli@latest dev
```

构建并启动（生产环境）
```bash
pnpm build && pnpm start
# 或
npm run build && npm start
```

打开 http://localhost:3000 查看应用。

## 🐳 Docker 安装

您可以使用 Docker Compose 轻松运行 OpenStock 和 MongoDB.

1) 确保已安装 Docker 和 Docker Compose.

2) docker-compose.yml 包含两个服务：
- openstock（本应用）
- mongodb（带有持久卷的 MongoDB 数据库）

3) 创建您的 `.env`（参见下面的示例）。对于 Docker 设置，请使用如下本地连接字符串：
```env
MONGODB_URI=mongodb://root:example@mongodb:27017/openstock?authSource=admin
```

4) 启动服务栈：
```bash
# 从仓库根目录执行
docker compose up -d mongodb && docker compose up -d --build
```

5) 访问应用：
- 应用地址：http://localhost:3000
- MongoDB 在 Docker 网络内部的地址为 mongodb:27017

注意
- 应用服务 `depends_on`（依赖于）mongodb 服务。
- 凭据在 Compose 中为 MongoDB root 用户定义；连接字符串需要 `authSource=admin` 才能以 root 身份登录。
- 数据通过 docker 卷在重启后保持持久化。

可选：本项目中使用的 MongoDB 服务定义示例：
```yaml
services:
  mongodb:
    image: mongo:7
    container_name: mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: example
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mongo-data:
```

## 🔐 环境变量

在项目根目录创建 `.env`。选择托管的 MongoDB (Atlas) URI 或本地 Docker URI。

托管模式 (MongoDB Atlas):
```env
# 核心
NODE_ENV=development

# 数据库 (Atlas)
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority

# Better Auth
BETTER_AUTH_SECRET=你的_better_auth_密钥
BETTER_AUTH_URL=http://localhost:3000

# Finnhub
# 注意：Vercel 部署需要 NEXT_PUBLIC_FINNHUB_API_KEY
NEXT_PUBLIC_FINNHUB_API_KEY=你的_finnhub_密钥
FINNHUB_BASE_URL=https://finnhub.io/api/v1

# Inngest AI (Gemini)
GEMINI_API_KEY=你的_gemini_api_密钥
# Inngest 签名密钥 (Vercel 部署需要)
# 从 Inngest 控制面板获取: https://app.inngest.com/env/settings/keys
INNGEST_SIGNING_KEY=你的_inngest_签名密钥

# 邮件 (通过 Gmail 的 Nodemailer；如果开启 2FA 请考虑使用应用专用密码)
NODEMAILER_EMAIL=你的邮箱@gmail.com
NODEMAILER_PASSWORD=你的_gmail_应用专用密码
```

本地模式 (Docker Compose) MongoDB:
```env
# 核心
NODE_ENV=development

# 数据库 (Docker)
MONGODB_URI=mongodb://root:example@mongodb:27017/openstock?authSource=admin

# Better Auth
BETTER_AUTH_SECRET=你的_better_auth_密钥
BETTER_AUTH_URL=http://localhost:3000

# Finnhub
# 注意：Vercel 部署需要 NEXT_PUBLIC_FINNHUB_API_KEY
NEXT_PUBLIC_FINNHUB_API_KEY=你的_finnhub_密钥
FINNHUB_BASE_URL=https://finnhub.io/api/v1

# Inngest AI (Gemini)
GEMINI_API_KEY=你的_gemini_api_密钥
# Inngest 签名密钥 (Vercel 部署需要)
# 从 Inngest 控制面板获取: https://app.inngest.com/env/settings/keys
INNGEST_SIGNING_KEY=你的_inngest_签名密钥

# 邮件 (通过 Gmail 的 Nodemailer；如果开启 2FA 请考虑使用应用专用密码)
NODEMAILER_EMAIL=你的邮箱@gmail.com
NODEMAILER_PASSWORD=你的_gmail_应用专用密码
```

注意
- 尽可能将私钥保留在服务器端。
- 如果使用 `NEXT_PUBLIC_` 变量，请记住它们会暴露给浏览器。
- 在生产环境中，建议使用专业的 SMTP 提供商，而非个人 Gmail。
- 不要将秘钥硬编码在 Dockerfile 中；请使用 `.env` 和 Compose。

## 🧱 项目结构

```
app/
  (auth)/
    layout.tsx
    sign-in/page.tsx
    sign-up/page.tsx
  (root)/
    layout.tsx
    page.tsx
    help/page.tsx
    stocks/[symbol]/page.tsx
  api/inngest/route.ts
  globals.css
  layout.tsx
components/
  ui/…          # shadcn/radix 原语 (按钮、对话框、命令、输入框等)
  forms/…       # InputField, SelectField, CountrySelectField, FooterLink
  Header.tsx, Footer.tsx, SearchCommand.tsx, WatchlistButton.tsx, …
database/
  models/watchlist.model.ts
  mongoose.ts
lib/
  actions/…     # 服务器操作 (auth, finnhub, user, watchlist)
  better-auth/…
  inngest/…     # 客户端、函数、提示词
  nodemailer/…  # 传输器、邮件模板
  constants.ts, utils.ts
scripts/
  test-db.mjs
types/
  global.d.ts
next.config.ts          # i.ibb.co 图片域名允许列表
postcss.config.mjs      # Tailwind v4 postcss 设置
components.json         # shadcn 配置
public/assets/images/   # logo 和截图
```

## 📡 数据与集成

- Finnhub
    - 股票搜索、公司概况和市场新闻。
    - 设置 `NEXT_PUBLIC_FINNHUB_API_KEY` 和 `FINNHUB_BASE_URL`（默认：https://finnhub.io/api/v1）。
    - 免费套餐可能会返回延迟行情；请遵守速率限制。

- TradingView
    - 用于图表、热力图、报价和时间线的可嵌入小部件。
    - 来自 `i.ibb.co` 的外部图片已在 `next.config.ts` 中加入允许列表。

- Better Auth + MongoDB
    - 带有 MongoDB 适配器的邮箱/密码认证。
    - 通过中间件进行会话验证；大多数路由均受保护，`sign-in`、`sign-up`、资产和 Next 内部路由除外。

- Inngest
    - 工作流：
        - `app/user.created` → AI 个性化欢迎邮件
        - 定时任务 `0 12 * * *` → 每日为每位用户提供新闻摘要
    - 本地开发：`npx inngest-cli@latest dev`。

- 邮件 (Nodemailer)
    - Gmail 传输。更新凭据或切换到您的 SMTP 提供商。
    - 欢迎邮件和新闻摘要邮件模板。

## 🧪 脚本与工具

包管理脚本
- `dev`: 带有 Turbopack 的 Next.js 开发服务器
- `build`: 生产环境构建 (Turbopack)
- `start`: 运行生产环境服务器
- `lint`: ESLint 代码检查
- `test:db`: 验证数据库连接

开发者体验
- TypeScript 严格模式
- Tailwind CSS v4（无需单独的 tailwind.config）
- 采用 Radix 原语的 shadcn/ui 组件
- cmdk 命令面板、next-themes、lucide-react 图标

## 🤝 贡献指南

这里属于每一位贡献者。无论您是学生、自学成才的开发者还是资深工程师——我们都欢迎您的贡献。

- 开启 issue 来讨论想法或报告 bug
- 寻找“good first issue”或“help wanted”标签
- 保持 PR 聚焦；为 UI 更改添加截图
- 保持友善，指导新人，拒绝行业门槛——这就是 ODS（Open Dev Society）的方式

## 🛡️ 安全建议

如果您发现漏洞：
- 请勿开启公开 issue
- 发送邮件至：opendevsociety@cc.cc
- 我们将协调负责任的披露并迅速修复

## 📜 许可证

OpenStock 将永远对每个人免费且开放。本项目根据 AGPL-3.0 许可证授权——详情请参阅 LICENSE 文件。

## 🙏 致谢

- Finnhub 提供易于获取的市场数据
- TradingView 提供可嵌入的市场小部件
- shadcn/ui, Radix UI, Tailwind CSS, Next.js 社区
- Inngest 提供可靠的后台任务和工作流
- Better Auth 提供简单且安全的身份验证
- 感谢所有使开源工具成为可能的贡献者

— 公开构建，人人可用，永久免费。Open Dev Society。

> © Open Dev Society。本项目根据 AGPL-3.0 许可证授权；如果您修改、重新分发或部署本项目（包括作为 Web 服务），您必须根据相同的许可证发布源代码并注明原作者。

## 我们尊贵的贡献者
- [ravixalgorithm](https://github.com/ravixalgorithm) - 从零开始开发了整个应用，包括认证、UI 设计、API 和 AI 集成以及部署。
- [Priyanshuu00007](https://github.com/Priyanshuu00007) - 设计了官方 OpenStock logo 并为项目的视觉识别做出贡献。
- [chinnsenn](https://github.com/chinnsenn) - 为仓库设置了 Docker 配置，确保了流程的开发和部署过程。
- [koevoet1221](https://github.com/koevoet1221) - 解决了 MongoDB Docker 构建问题，提高了项目的整体稳定性和可靠性。

## ❤️ 合作伙伴与赞助商

<a href="https://www.siray.ai/">
  <img src="public/assets/icons/siray.svg" alt="Siray.ai Logo" width="100" />
</a>

**[Siray.ai](https://www.siray.ai/)** — OpenStock 背后的强大 AI 基础设施。Siray.ai 确保我们的市场洞察永不眠。

## 特别鸣谢
非常感谢 [Adrian Hajdin (JavaScript Mastery)](https://github.com/adrianhajdin) —— 他的出色股票市场应用教程对 Open Dev Society 在开源社区下构建 OpenStock 具有重要的指导意义。

GitHub: [adrianhajdin](https://github.com/adrianhajdin)
YouTube 教程: [股票市场应用教程](https://www.youtube.com/watch?v=gu4pafNCXng)
YouTube 频道: [JavaScript Mastery](https://www.youtube.com/@javascriptmastery)
