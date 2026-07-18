FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY . .

# Generate Prisma Client and Build
RUN npx prisma generate
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache openssl

COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
