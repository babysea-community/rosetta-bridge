# Security Policy

## Supported versions

`rosetta-bridge` is a production-grade v0.x OSS primitive. Security fixes target the latest public release and the `main` branch.

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub's **Report a vulnerability** flow on the public `babysea-community/rosetta-bridge` repository. If that flow is unavailable, contact the maintainers at `dev@babysea.ai`.

Do not open a public issue for suspected vulnerabilities. We will acknowledge valid reports as quickly as possible, investigate impact, and publish a fix or mitigation before public disclosure.

## Sentry code guard

The public OSS repository is connected to a private, repository-specific Sentry project for repository ownership, Seer-assisted review, and issue routing. The Sentry organization slug and project slug are intentionally not committed to this public repo.

This repo keeps Sentry as a repository guardrail, not runtime telemetry. It ships `scripts/sentry-project-check.mjs` and a scheduled `Sentry Project Check` workflow that verifies the configured project slug, active status, `other` platform, and Code Guard ownership rules using GitHub Actions secrets only. Use `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` as repository secrets. Local `.sentryclirc` files are ignored by git. No Sentry SDK, DSN, tracing, or runtime telemetry is included in this package.

## Runtime posture

`rosetta-bridge` is a local validation and payload-conversion library. It does not include a hosted service, network client, provider credentials, telemetry, or secret storage. Integrations must keep provider API keys server-side and call `toProviderInput(...)` only after authenticating and authorizing the request in their own backend.

URL validation is syntactic and limited to `http`/`https`. Applications that accept user-provided URLs should also enforce trusted storage origins, signed URLs, or SSRF protections before sending payloads to providers.

## Security model

| Boundary | Owner | Security requirement |
| :------- | :---- | :------------------- |
| Public request | Your backend | Authenticate and authorize the caller before normalization and dispatch. |
| Schema validation | `rosetta-bridge` | Keep strict validation enabled by default and reject unknown `request_*` fields before adapter execution. |
| Provider adapter | Trusted application code | Keep provider-native names, credentials, callback URLs, account IDs, and region hints out of customer input. |
| Provider execution | Your backend | Call provider SDKs/routes outside this package after provider selection and policy checks. |
| CLI mapping | Local trusted environment | Use `map` only with bridge modules you trust because executable adapters run JavaScript. |

## Boundary checklist

- Treat every public request as untrusted input and keep `strict` validation enabled unless you have a migration plan for legacy callers.
- Keep provider-native names and provider-only options inside adapter functions, not in public `request_*` schemas.
- Declare defaults in field specs. Do not inherit provider defaults silently.
- Version breaking public contract changes as a new schema version instead of changing `bridge-definition.v1` or `normalization-result.v1` in place.
- Use the CLI `map` command only with trusted local bridge modules. Executable bridge modules run arbitrary JavaScript because provider adapters are functions.
- Never commit provider API keys, customer requests, private catalogs, or production provider payloads in fixtures.

## Operational guardrails

- Keep `request_*` fixtures synthetic and provider IDs public-neutral in OSS docs.
- Keep URL fields HTTP(S)-only in runtime and schema contracts; add host-level origin allowlists or signed URL checks before provider dispatch.
- Treat generated provider payloads as potentially sensitive because they may contain customer prompts or asset URLs.
- Keep Sentry as repository code guard only. Do not add runtime DSNs, tracing, or telemetry to this package without a documented product requirement.
- Keep Package Check green: TypeScript lint, coverage, build, CLI smoke, and package dry-run.
- Run CLI smoke tests after adapter, fixture, or schema changes.

## Incident response

For leaked credentials, unsafe public fields, or incorrect provider payloads:

1. Remove the exposed field or fixture from public docs/examples and rotate any affected provider secret.
2. Identify affected bridge versions, request fields, fixtures, and provider adapters.
3. Add or update tests that reproduce the validation or mapping failure.
4. Publish a patch or mitigation before public disclosure when the package is affected.
5. If a public contract must break, add a new schema version and keep v1 available for existing consumers.

## Data handling

`rosetta-bridge` does not persist data. It may process prompts, asset URLs, provider-order preferences, moderation settings, and provider-native payload fields in memory. Applications that log `ValidationError` issues, canonical envelopes, or provider payloads should redact customer prompts, signed URLs, internal provider IDs, and account-specific routing metadata before storing or sharing logs.
