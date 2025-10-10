FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --strict-peer-dependencies=false

COPY . .

EXPOSE 3000
CMD ["pnpm", "run", "dev"]