# SweetByte: one image with the Spring Boot backend (:8080) and the Next.js frontend (:3001).
#
# DB password and Supabase service-role key: backend/src/main/resources/application-local.properties (gitignored).
# Geoapify key (browser, address search): --build-arg NEXT_PUBLIC_GEOAPIFY_API_KEY=... (never commit it).
#
# Build:  docker build -t sweetbyte .   (demo platform: see demo/compose.yaml instead)
# Run:    docker run -p 8080:8080 -p 3001:3001 sweetbyte
# Open http://localhost:3001

# ---------- 1. backend: Maven -> executable jar ----------
# Runs on the build machine's own platform: the jar works on any CPU, and Maven under
# emulation (multi-arch CI build) would be very slow.
FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jdk AS backend-build
WORKDIR /build
# dependencies first, so they stay cached while only the source changes
COPY backend/mvnw backend/pom.xml ./
COPY backend/.mvn .mvn
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline
COPY backend/src src
RUN ./mvnw -B -q -DskipTests package && cp target/eats-*.jar /build/app.jar

# ---------- 2. frontend: next build ----------
FROM node:22-bookworm-slim AS frontend-build
WORKDIR /build
COPY FrontEnd/package.json FrontEnd/package-lock.json ./
RUN npm ci
COPY FrontEnd/ ./
# NEXT_PUBLIC_* values are written into the browser bundle at build time.
ARG NEXT_PUBLIC_GEOAPIFY_API_KEY=
# The browser calls the backend at this URL, so it must be reachable from the user's machine.
ENV NEXT_PUBLIC_API_URL=http://localhost:8080 \
    NEXT_PUBLIC_GEOAPIFY_API_KEY=$NEXT_PUBLIC_GEOAPIFY_API_KEY \
    NEXT_PUBLIC_USE_MOCKS=false \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build && npm prune --omit=dev

# ---------- 3. runtime: Node + Java 21 JRE ----------
FROM node:22-bookworm-slim
# the JRE comes straight from the official Temurin image
ENV JAVA_HOME=/opt/java/openjdk \
    PATH=/opt/java/openjdk/bin:$PATH \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=eclipse-temurin:21-jre /opt/java/openjdk /opt/java/openjdk

WORKDIR /app
COPY --from=backend-build /build/app.jar backend/app.jar
COPY --from=frontend-build /build/package.json frontend/package.json
COPY --from=frontend-build /build/node_modules frontend/node_modules
COPY --from=frontend-build /build/.next frontend/.next
COPY docker/start.sh start.sh
RUN chmod +x start.sh && chown -R node:node /app

USER node
EXPOSE 8080 3001
CMD ["./start.sh"]
