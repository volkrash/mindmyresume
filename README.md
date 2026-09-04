# React + Vite

## Secure billing deployment

Billing is fulfilled server-side through Stripe Checkout and a signed Stripe webhook. For a local Amplify sandbox, configure these secrets:

```bash
npx ampx sandbox secret set STRIPE_SECRET_KEY
npx ampx sandbox secret set STRIPE_WEBHOOK_SECRET
npx ampx sandbox secret set STRIPE_UNLIMITED_PRICE_ID
npx ampx sandbox secret set STRIPE_CREDITS_PRICE_ID
npx ampx sandbox secret set APP_URL
npx ampx sandbox secret set OPENAI_API_KEY
```

Use Stripe Price IDs (`price_...`), not Payment Link URLs. After deployment, copy `custom.stripeWebhookUrl` from `amplify_outputs.json` into a Stripe webhook endpoint and subscribe it to `checkout.session.completed`. Then update `STRIPE_WEBHOOK_SECRET` with that endpoint's signing secret and redeploy.

For a hosted branch, add the same six names under **Amplify Console → Hosting → Secrets** instead of using the sandbox commands.

Add the operator account to the Cognito `ADMINS` group before using the access-code administration screen. Billing status, access-code redemption, and AI credits are stored and enforced in the backend; browser URL parameters and local storage do not grant access.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
