# Production image for a Vite, React, Vue or Angular frontend: build once, then serve the files
# with nginx. Save it as `Dockerfile` in your frontend folder, next to `nginx.conf`.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vite and React write to dist/. Angular writes to dist/<project>/browser: adjust the COPY below.
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
