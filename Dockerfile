# 使用官方 Node.js 20 版本作为基础镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json（或 pnpm-lock.yaml）以利用缓存
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# 安装依赖（根据你使用的包管理器选择）
RUN npm install
# 如果使用 pnpm，替换为：
# RUN npm install -g pnpm && pnpm install

# 复制项目所有文件
COPY . .

# 构建 Next.js 应用
RUN npm run build
# 或 pnpm run build

# 暴露应用端口（默认 Next.js 生产端口为3000）
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]
# 或 pnpm 启动
# CMD ["pnpm", "start"]
