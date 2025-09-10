# # Use official Nginx image as parent (with full registry path)
# FROM docker.io/library/nginx:alpine

# # Set the working directory in the container
# WORKDIR /usr/share/nginx/html

# # Remove default nginx static files
# RUN rm -rf ./*

# # Copy frontend build artifacts from Jenkins workspace into container
# COPY dist/ ./

# # Expose port 80
# EXPOSE 80

# # Start nginx
# CMD ["nginx", "-g", "daemon off;"]

# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
