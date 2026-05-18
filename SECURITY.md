# Security Policy

## Reporting a vulnerability

Please use **[GitHub's private vulnerability reporting](https://github.com/dillonmcewan/loco_retro/security/advisories/new)** to report security issues. Do not open a public issue.

You'll get an acknowledgement within a few days. Fixes ship via a normal PR once a patch is ready; the advisory is published when the fix is released.

## Threat model

loco_retro is a frictionless, no-account retro tool. A few properties to be aware of when assessing risk:

- **No authentication.** Anyone with a room URL can join, edit, vote, and export. Treat room URLs as the sole capability token. Share them only with intended participants.
- **Retro content is stored unencrypted** in the PartyKit Durable Object backing each room, and in each participant's browser IndexedDB. Don't paste secrets, credentials, or sensitive personal data into cards.
- **No server-side access controls.** The facilitator role is a client-side affordance, not a server-enforced permission.

See [`docs/prd.md`](docs/prd.md) for the full product trust model.
