FROM node:20-alpine AS builder

WORKDIR /build

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /build/package.json /app/package.json
COPY --from=builder /build/package-lock.json /app/package-lock.json

RUN npm ci --omit=dev

COPY --from=builder /build/dist/ /app/dist/

EXPOSE 8000

CMD ["npm", "start"]