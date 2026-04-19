# Customer Service Rules

- This repo owns the customer API contract exposed from `GET /customers/{customerId}`.
- Prefer minimal changes to the response shape and keep existing fields backward compatible unless asked otherwise.
- If the customer contract changes, call out the likely downstream impact on `order-service`.
- Run `./gradlew test` after code changes.
