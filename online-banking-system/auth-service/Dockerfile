# Build context is the REPO ROOT (see docker-compose.yml: context: ., dockerfile: auth-service/Dockerfile)
# so the multi-module reactor (common/*) is visible to the build stage.

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
COPY common ./common
COPY auth-service ./auth-service
RUN mvn -q -pl auth-service -am -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /workspace/auth-service/target/auth-service.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
