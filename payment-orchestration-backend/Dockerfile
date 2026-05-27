FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy POM files first — lets Docker cache the dependency download layer
# separately from source changes
COPY pom.xml .
COPY pos-common/pom.xml pos-common/
COPY pos-domain/pom.xml pos-domain/
COPY pos-provider/pom.xml pos-provider/
COPY pos-routing/pom.xml pos-routing/
COPY pos-payment/pom.xml pos-payment/
COPY pos-admin/pom.xml pos-admin/
COPY pos-api/pom.xml pos-api/
RUN mvn dependency:go-offline -pl pos-api -am -q

# Now copy source and build — only invalidates cache when code changes
COPY . .
RUN mvn clean package -pl pos-api -am -DskipTests -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/pos-api/target/pos-api-*.jar app.jar
EXPOSE 9080
ENTRYPOINT ["java", "-jar", "app.jar"]
