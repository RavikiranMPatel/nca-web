# =========================
# 1️⃣ Build stage
# =========================
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency files first (better caching)
COPY package.json package-lock.json ./

RUN npm ci

# Copy application source
COPY . .

# Build Vite app
RUN npm run build


# =========================
# 2️⃣ Runtime stage (Nginx)
# =========================
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Remove default html
RUN rm -rf /usr/share/nginx/html/*

# Copy built frontend
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
