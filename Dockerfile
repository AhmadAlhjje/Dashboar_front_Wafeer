# ── لوحة تحكم وفير — الواجهة (React + Vite) ──────────────────────────────────
# المرحلة الأولى تبني الملفات الساكنة، والثانية تقدّمها عبر nginx على المنفذ 5001
# وتمرّر /api إلى الباك اند (API_UPSTREAM، افتراضياً host.docker.internal:5000) — نفس الأصل فلا حاجة لـ CORS.
# ملف .env المحلي مستثنى (.dockerignore)؛ عنوان الـ API داخل الصورة هو /api دائماً.

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV VITE_API_URL=/api
RUN npm run build

FROM nginx:1.27-alpine
# صورة nginx الرسمية تشغّل envsubst على /etc/nginx/templates/*.template عند الإقلاع
ENV API_UPSTREAM=host.docker.internal:5000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 5001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:5001/ || exit 1
