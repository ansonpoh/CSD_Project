FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
RUN set -eux; \
    sed -i 's/\r$//' mvnw; \
    chmod +x mvnw; \
    for attempt in 1 2 3; do \
      ./mvnw -DskipTests --no-transfer-progress \
        -Dmaven.wagon.http.retryHandler.count=5 \
        -Dmaven.wagon.httpconnectionManager.ttlSeconds=120 \
        package && break; \
      if [ "$attempt" -eq 3 ]; then \
        exit 1; \
      fi; \
      sleep $((attempt * 5)); \
    done

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar /app/app.jar
EXPOSE 8084
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
