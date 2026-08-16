# Contributing

Thanks for helping improve WPS Word Formatter.

## Development requirements

- Node.js 22
- npm
- For real integration testing: Windows 10/11 with WPS Writer 12.0

## Before submitting a pull request

Run:

```bash
npm ci
npm audit --audit-level=high
npm run typecheck
npm test
npm run build
```

All validation commands must pass before merge. If `npm audit` reports a high/critical issue that cannot be fixed immediately, document the exact package, advisory, exposure analysis, and temporary mitigation in the PR instead of silently ignoring it.

## Architecture rules

- Vue components must not directly call WPS host/COM objects.
- WPS-specific access belongs behind the WriterAdapter/WPS adapter boundary.
- Production WPS behavior must never silently fall back to mock data; mock behavior belongs in `MockWriterAdapter` or other explicitly development-only code.
- Pure recognition/planning/audit logic should remain independent from WPS APIs where practical.
- Any operation that can modify document content or structure must preserve the existing backup/Undo/snapshot/integrity-validation safety chain.
- Do not add cloud APIs, telemetry, document uploads, executables, Python services, or local servers without an explicit project-level design decision.

## Privacy and test data

Never commit real business documents, customer data, employee names, account numbers, credentials, API tokens, private email addresses, or personal machine paths. Tests and screenshots must use synthetic fixtures such as `C:\Users\TestUser\Documents\...`.

## Pull requests

Keep changes focused. Explain the WPS version used for integration testing and whether the change was validated only by unit tests or also on a real WPS Writer host.

Changes to install/uninstall scripts must explicitly verify that unrelated entries in WPS `publish.xml` remain untouched.
