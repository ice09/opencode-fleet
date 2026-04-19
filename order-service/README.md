# Order Service

Simple Spring Boot consumer service for the bundled OpenCode Fleet showcase.

## What it owns

- `GET /orders/{orderId}/summary` returns a combined order view
- a tiny in-memory order catalog
- the HTTP client that depends on `customer-service`

## Run the app

```bash
./gradlew bootRun
```

The app listens on `http://localhost:8082` and calls `customer-service` on `http://localhost:8081` by default.

## Run OpenCode for this repo

```bash
opencode serve --port 4002
```

Example repo-local prompt:

```text
Consume a new loyaltyStatus field from customer-service in the order summary response and update tests.
```
