# Order Service Rules

- This repo owns the order summary API exposed from `GET /orders/{orderId}/summary`.
- It depends on `customer-service` through the HTTP contract configured by `customer.service.base-url`.
- Prefer contract-safe changes and make upstream assumptions explicit in code or tests.
- Run `./gradlew test` after code changes.
