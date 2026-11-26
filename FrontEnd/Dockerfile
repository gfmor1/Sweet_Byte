# SweetByte frontend (Next.js, `next start` on :3001). Build context: this folder.
#   docker build --platform linux/amd64 -t sweetbyte-frontend FrontEnd
# On the demo platform it sits behind the `web` nginx service, which sends /api/ to the backend.

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_* values are frozen into the browser bundle by `next build`.
# Empty API URL: the browser calls /api/... on the page's own address (nginx proxies it).
# The Geoapify key (address search at checkout) is a browser key: pass it with
#   --build-arg NEXT_PUBLIC_GEOAPIFY_API_KEY=...   (never commit it). Empty = search disabled.
ARG NEXT_PUBLIC_GEOAPIFY_API_KEY=
ENV NEXT_PUBLIC_API_URL="" \
    NEXT_PUBLIC_GEOAPIFY_API_KEY=$NEXT_PUBLIC_GEOAPIFY_API_KEY \
    NEXT_PUBLIC_USE_MOCKS=false \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
USER node
EXPOSE 3001
CMD ["node_modules/.bin/next", "start", "-p", "3001", "-H", "0.0.0.0"]
