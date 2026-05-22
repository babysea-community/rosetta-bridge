# rosetta-bridge

`rosetta-bridge` is a public request-normalization primitive for multi-provider media workloads.
See [README.md](README.md) for the full story.

This file mirrors the README so deploys, IDEs, and tooling that read `AGENTS.md` see the same context.

## Scope

- **Supported OSS stack:** TypeScript adapters + JSON Schema Draft 2020-12 contracts only.
- **Inspired by BabySea production:** provider docs/raw schema notes ➜ strict public `request_*` schema ➜ provider-native payload adapters.
- **Not included:** hosted routes, provider SDK calls, auth, persistence, billing, queues, credit settlement, webhooks, telemetry, or private provider catalogs.
- **Naming:** BabySea production uses `generation_*`; this OSS uses lowercase snake-case `request_*` fields to stay public-neutral.

## Layout

| Path | Purpose |
|---|---|
| `client/typescript/` | TypeScript SDK and normalization engine |
| `schemas/` | JSON Schemas: `bridge-definition.v1.json`, `normalization-result.v1.json` |
| `docs/` | Architecture and normalization-rule guides |
| `examples/typescript-sdk-demo/` | Minimal adapter walkthrough |
| `examples/fixtures/` | Fixture-driven valid, invalid, and provider-mapping examples |

## Conventions

- **Apache 2.0** license. Apply the header in every source file.
- **Schemas are the contract.** Public manifests and result envelopes reference the JSON Schemas in `schemas/`.
- **Versioned contracts.** Never break v1 in place - publish v2 alongside.
- **Strict before dispatch.** Invalid canonical input must fail before any provider payload is created.
- **Core/options boundary.** Core fields map in `mapCore`; option fields map in `mapOptions`; both receive full normalized context. Use `mapStructured` only for nested payload exceptions.
- **Intersection by default.** Aspect ratios, formats, input-asset limits, and pricing dimensions must be safe for every registered provider.
- **Pricing dimensions are core.** Keep duration, resolution, audio mode, and input-asset limits in core fields so host applications can inspect them before dispatch.
- **HTTP(S) URLs only.** Runtime validation and JSON Schema contracts must stay aligned on `http://` and `https://` URL fields.
- **Public-neutral surface.** Use placeholder providers and lowercase snake-case `request_*` examples. Prefer public terms such as `request_moderation`, `request_enhance_prompt`, and `request_provider_order: 'fastest'`. Do not expose private provider IDs, internal file names, production field names, credentials, or route handlers.
- **TypeScript:** strict mode, no `any`.
