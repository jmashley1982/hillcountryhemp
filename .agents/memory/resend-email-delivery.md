---
name: Resend email delivery
description: How transactional email works (Resend via Replit connector) and the domain-verification gotcha that blocks real delivery.
---

Transactional email (password reset, welcome, admin alerts, listing approved/rejected) goes through Resend, wired via the Replit **Resend connector** (not a plain env var).

- The mailer resolves the API key by fetching the connector proxy at `REPLIT_CONNECTORS_HOSTNAME` (`/api/v2/connection?include_secrets=true&connector_names=resend`), reading `items[0].settings.api_key`. Falls back to a `RESEND_API_KEY` env secret if the connector is absent.
- The connector also exposes a `from_email` setting, but we intentionally **ignore it** for the send-from: it was configured to a `gmail.com` address, which Resend cannot verify as a sending domain. The sender is `EMAIL_FROM` env → else the hard default `noreply@hillcountryhempfinder.com`.

**Why delivery may still fail:** Resend rejects sends from an unverified domain with HTTP 403 `validation_error` "domain is not verified". `hillcountryhempfinder.com` must be verified in the Resend dashboard (add DNS SPF/DKIM records) — a **user action** outside code. Until then, Resend only allows sending from `onboarding@resend.dev` to the Resend account owner's own address.

**How to apply:**
- The Resend SDK's `emails.send()` returns `{ data, error }` — it does NOT throw on API errors. Always check `error` or false "sent" logs result.
- Any route that awaits a mailer call must wrap it in try/catch. `forgot-password` in particular must still return `{success:true}` (anti-enumeration) and never surface a 500/stack trace when email fails.
