# =========================
# 1️⃣ BUILD STAGE
# =========================
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the source code
COPY . .

# Build Vite app (output goes to /app/dist)
RUN npm run build

# =========================
# 2️⃣ RUNTIME STAGE
# =========================
FROM nginx:alpine

# Copy custom nginx config (REVERSE PROXY ENABLED)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy built frontend from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
