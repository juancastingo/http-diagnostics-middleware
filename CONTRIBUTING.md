# Contributing to HTTP Diagnostics Middleware

Thank you for contributing to `@juancastingo/http-diagnostics-middleware`!

## Local Development

```bash
git clone https://github.com/juancastingo/http-diagnostics-middleware.git
cd http-diagnostics-middleware
npm install
npm test
npm run build
```

## Guidelines

- Keep the core middleware lightweight with **zero required runtime dependencies**.
- Ensure that credentials, bearer tokens, cookies, and secret query parameters remain strictly masked by default.
- Write tests for any new anomaly heuristics or server frameworks supported.
