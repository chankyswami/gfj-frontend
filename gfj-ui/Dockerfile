FROM docker.io/nginx:alpine3.20

RUN apk update && apk upgrade --no-cache

WORKDIR /usr/share/nginx/html
RUN rm -rf ./*

COPY dist/ ./
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]



# # Use official Nginx image as parent (with full registry path)
# FROM docker.io/library/nginx:alpine3.20

# # Set the working directory in the container
# WORKDIR /usr/share/nginx/html

# # Remove default nginx static files
# RUN rm -rf ./*

# # Copy frontend build artifacts from Jenkins workspace into container
# COPY dist/ ./

# COPY nginx.conf /etc/nginx/conf.d/default.conf

# # Expose port 80
# EXPOSE 80

# # Start nginx
# CMD ["nginx", "-g", "daemon off;"]
