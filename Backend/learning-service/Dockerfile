# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
RUN set -eux; \
    sed -i 's/\r$//' mvnw; \
    chmod +x mvnw; \
    for attempt in 1 2 3; do \
      ./mvnw clean -DskipTests --no-transfer-progress \
        -Dmaven.wagon.http.retryHandler.count=5 \
        -Dmaven.wagon.httpconnectionManager.ttlSeconds=120 \
        package && break; \
      if [ "$attempt" -eq 3 ]; then \
        exit 1; \
      fi; \
      sleep $((attempt * 5)); \
    done


# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM gcr.io/distroless/java21-debian12:nonroot
WORKDIR /app
COPY --from=build --chown=nonroot:nonroot /app/target/*.jar /app/app.jar
EXPOSE 8083
CMD ["-jar", "/app/app.jar"]
