FROM node:20-alpine

WORKDIR /app/backend

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=5000
ENV YOK_TEMPLATES_DIR="/app/2025-2026 yök izleme şablonlar"

EXPOSE 5000

CMD ["node", "index.js"]
