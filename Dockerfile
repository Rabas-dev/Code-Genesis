FROM node:20-bookworm-slim

# node-pty compiles a native addon — needs python + build tools
RUN apt-get update && apt-get install -y python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# npm strips the execute bit from prebuilt binaries — restore it
RUN chmod +x node_modules/node-pty/prebuilds/*/spawn-helper || true

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
