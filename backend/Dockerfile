# Lockship Backend Production Container
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install dependencies only for production
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY src ./src
COPY scripts ./scripts

# Run as non-privileged node user
USER node

EXPOSE 5000

CMD ["node", "src/server.js"]
