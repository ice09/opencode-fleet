# Customer Service

Simple Spring Boot producer service for the bundled OpenCode Fleet showcase.

## What it owns

- `GET /customers/{customerId}` returns customer details
- the customer contract consumed by `order-service`
- a tiny in-memory customer directory so the demo stays self-contained

## Run the app

```bash
./gradlew bootRun
```

The app listens on `http://localhost:8081`.

## Run OpenCode for this repo

```bash
opencode serve --port 4001
```

Example repo-local prompt:

```text
Add loyaltyStatus to the customer response, keep the current contract backward compatible, and update tests.
```
