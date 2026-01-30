# 使用官方 Node.js 20 Alpine 镜像作为基础镜像
FROM node:20-alpine

# 设置容器内的运行目录
WORKDIR /app

# 复制 package.json 和 package-lock.json 映射，利用 Docker 缓存
COPY package*.json ./
# 如果您使用 pnpm，请取消下面一行的注释并确保有 pnpm-lock.yaml
# COPY pnpm-lock.yaml ./

# 安装项目依赖（选择 npm 或 pnpm）
RUN npm install
# 如果使用 pnpm，请替换为:
# RUN npm install -g pnpm && pnpm install

# 复制所有项目文件到容器
COPY . .

# 构建 Next.js 应用程序 (生产环境)
RUN npm run build
# 如果使用 pnpm:
# RUN pnpm run build

# 暴露 Next.js 运行的端口
EXPOSE 3000

# 启动 Next.js 生产环境服务器
CMD ["npm", "start"]
# 如果使用 pnpm:
# CMD ["pnpm", "start"]
