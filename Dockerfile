FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY dist ./dist
COPY README.md server.json ./

ENTRYPOINT ["node", "dist/index.js"]
