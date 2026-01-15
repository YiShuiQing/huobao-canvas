# multi-stage Dockerfile for Vite + pnpm frontend
FROM node:18-alpine AS builder
WORKDIR /app

# 只复制 package/pnpm lock 以利用缓存
COPY package.json pnpm-lock.yaml ./

# 启用 corepack 并激活 pnpm（node:18 自带 corepack）
RUN corepack enable && corepack prepare pnpm@latest --activate

# 安装依赖（使用锁文件）
RUN pnpm install --frozen-lockfile

# 复制源代码并构建
COPY . .
RUN pnpm run build

# 生产镜像，使用 nginx 提供静态内容
FROM nginx:stable-alpine AS runner
# 如果需要自定义 nginx 配置，下面会覆盖默认 config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 拷贝构建产物到 nginx 默认目录
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
