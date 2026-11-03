# Backend credentials

Configure `DATABASE_URL`, `MAIL_FROM_EMAIL`, `BREVO_API_KEY`, `STRIPE_SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `SESSION_SECRET` in the runtime environment before deploying this change. The backend now fails with the variable name when required credentials are absent. Set `STRIPE_WEBHOOK_SECRET` for webhook verification as before.

Generate fresh credentials rather than copying the previously committed values. Rotate the Brevo key, Stripe test key, Google OAuth client secret, and session secret. Changing the session secret invalidates existing signed sessions. Never put credential values in issues, pull requests, logs, or tracked environment files.

This independent repository starts with a new root commit and does not import the original Git history, branches, tags, or pull-request refs. Previously committed credentials remain in the original repository and its existing clones until their owners rotate them. The original repository, collaborator permissions, and running deployments are unchanged. No database data or user profile/review uploads are transferred. Runtime user uploads and local environment files are excluded from version control.
