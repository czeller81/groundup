# Scoped AI provider access

The public OpenAPI document is available at `/api/ai/v1/openapi.json`. It contains no credential values. Protected operations require an HTTPS bearer token and the `x-required-scopes` listed for each operation.

## Configuration

- Add `LIME_AGENT_API_KEY` as a Replit Secret. It must be a distinct credential from the legacy key.
- Set `LIME_AGENT_API_SCOPES` as a comma-separated environment variable containing only the capabilities Lime should receive.
- Missing scopes grant no provider capabilities. Unsupported configured scopes fail closed.
- `AI_MANAGEMENT_API_KEY` continues to work as the backward-compatible broad credential. Do not give it to Lime when least privilege is required.
- If the provider and legacy credentials are identical, the API rejects them as a configuration collision.

## Current REST operations and required scopes

| Method and path | Required provider scope(s) |
| --- | --- |
| `GET /api/ai/v1/operations/summary` | `operations:summary:read`, `discovery-pass:report:read` |
| `GET /api/ai/v1/operations/schedule` | `schedule:read` |
| `GET /api/ai/v1/operations/members` | `member:read` |
| `GET /api/ai/v1/operations/bookings` | `booking:read` |
| `GET /api/ai/v1/operations/reservations` | `reservation:read` |
| `PATCH /api/ai/v1/operations/bookings/{id}/status` | `booking:status:update` |
| `GET /api/ai/v1/operations/memberships` | `membership:read` |
| `GET /api/ai/v1/operations/payments` | `payment:read` |
| `GET /api/ai/v1/operations/payments.csv` | `payment:read` |
| `GET /api/ai/v1/operations/reconciliation-health` | `payment:reconciliation:read` |
| `GET /api/ai/v1/operations/leads` | `lead:read` |
| `PATCH /api/ai/v1/operations/leads/{id}/status` | `lead:status:update` |
| `GET /api/ai/v1/operations/contacts` | `contact:read` |
| `PATCH /api/ai/v1/operations/contacts/{id}/status` | `contact:status:update` |
| `GET /api/ai/v1/marketing/discovery-funnel` | `discovery-pass:report:read` |
| `GET /api/ai/v1/marketing/discovery-ab` | `discovery-pass:report:read` |
| `GET /api/ai/v1/marketing/campaign-report` | `marketing:campaign-report:read` |

Booking status updates accept `pending`, `paid`, or `canceled`. This operation only changes the existing application booking record; it does not verify or create a Stripe payment. Grant `booking:status:update` only when this risk is explicitly accepted.

The API does not expose provider operations for creating/canceling bookings or reservations, issuing Discovery Passes, changing memberships, charging/refunding payments, or managing Stripe/Calendly configuration.

## Request tracing and audit logs

AI API responses include `X-Request-Id`. A valid UUID in the incoming `X-Request-Id` header is propagated; otherwise the server generates one. Authenticated and denied AI API calls write structured metadata containing the request ID, credential class, method, route template, required scopes, status, and duration. Tokens, request/response payloads, query strings, and record identifiers are not included in these audit records.

Authorization errors are JSON with stable machine-readable `code` values. Missing or invalid credentials return 401; insufficient scope returns 403; unsupported scope configuration or credential collision returns 503.