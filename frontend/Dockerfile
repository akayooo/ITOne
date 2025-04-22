FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the server.js (but we won't use it with nginx)
COPY --from=builder /app/server.js /usr/share/nginx/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 