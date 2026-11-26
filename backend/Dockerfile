# SweetByte backend (Spring Boot, Java 21). Build context: this folder.
#   docker build --platform linux/amd64 -t sweetbyte-backend backend
# Configuration comes from environment variables (see demo/compose.yaml); no secret is baked in.

# Maven runs on the build machine's own platform: the jar runs on any CPU, and Maven under
# emulation (amd64 on Apple silicon) is slow and can fail.
FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jdk AS build
WORKDIR /build
# dependencies first, so they stay cached while only the source changes
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN sh ./mvnw -B -q dependency:go-offline
COPY src src
RUN sh ./mvnw -B -q -DskipTests package && cp target/eats-*.jar app.jar

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /build/app.jar app.jar
RUN useradd --system --uid 10001 app
USER app
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
