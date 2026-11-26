# SweetByte public entry point on the demo platform: nginx on :80.
#   /api/  -> backend:8080 (Spring Boot)
#   /      -> frontend:3001 (Next.js)
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
