# multi-stage Dockerfile for Vite + pnpm frontend
FROM node:18-alpine AS builder
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production

# 只复制 package/pnpm lock 以利用缓存
COPY package.json pnpm-lock.yaml ./

# 启用 corepack 并激活 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 安装依赖（使用锁文件）
RUN pnpm install --frozen-lockfile

# 复制源代码并构建
COPY . .
RUN pnpm run build

# 生产镜像，使用 nginx 提供静态内容
FROM nginx:stable-alpine AS runner

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 拷贝构建产物到 nginx 默认目录的子文件夹中
COPY --from=builder /app/dist /usr/share/nginx/html/huobao-canvas

# 配置权限以支持非 root 运行
# nginx 用户在 alpine 镜像中已存在
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# 切换到非 root 用户
USER nginx

# 暴露端口 80
EXPOSE 80

# 添加健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:80/health || exit 1

CMD ["sh", "-c", "echo '================== huobao-canvas ==================' && echo 'AI Canvas 可视化 AI 创作画布服务启动中...' && echo '访问地址: http://0.0.0.0:80/huobao-canvas' && nginx -g 'daemon off;'"]
