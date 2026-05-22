# Architecture

`rosetta-bridge` packages a public request-normalization boundary as a small TypeScript SDK with JSON Schema contracts. It is designed for applications that expose one product API while dispatching work to more than one provider.

The public project intentionally avoids private production names, real provider configuration, internal file layouts, credentials, route handlers, and operating data. Examples use placeholder providers and neutral `request_*` fields.

## Stack boundary

The supported stack for this primitive is **TypeScript + JSON Schema**:

- TypeScript declares field specs, validates input, and runs adapter functions.
- JSON Schema Draft 2020-12 versions portable bridge manifests and normalization-result envelopes.
- The library does not include database tables, billing integrations, auth middleware, queues, provider SDK clients, hosted route handlers, webhooks, or telemetry.

Use the bridge inside your own backend after authentication and before provider dispatch. If your application persists canonical envelopes or settles usage through any database or billing provider, that integration remains outside this package.

This boundary is deliberate. BabySea production surrounds the same schema-hardening layer with private provider catalogs, persistence, billing, queues, webhooks, telemetry, and routing services, but the reusable OSS primitive is only the JSON + TypeScript normalization contract.

## BabySea implementation lineage

BabySea's production code follows the same invariant boundary enforced by its internal schema pipeline: provider docs are mirrored in raw provider schemas, the public API exposes one strict customer schema, and provider payloads are assembled only after validation. The OSS terms are neutralized for community use:

| Production pattern | Public pattern |
|---|---|
| Provider docs ➜ raw provider schemas | Provider contract notes stay outside customer input. |
| Refined `generation_*` schema | Public `request_*` field specs. |
| Shared input fields | `fields.core` + `mapCore(...)`. |
| Model-specific tuning fields | `fields.options` + `mapOptions(...)`. |
| Structured provider exceptions | `mapStructured(...)`. |
| Strict Zod object | Strict TypeScript validator + JSON Schema manifest. |

The portable JSON manifest does not contain raw provider schemas. Provider-native defaults, exclusions, and field names belong in adapter code or integration notes so the public request remains neutral.

## Control flow

```text
user request
    │
    ▼
application backend
  │  auth, billing, storage, queues, provider SDKs live here
  ▼
normalize(input)
    │  strict unknown-field rejection
    │  type, enum, URL, min/max validation
    │  defaults applied once
    ▼
canonical request
    ├─ mapCore(full context)     ➜ common provider fields
    └─ mapOptions(full context)  ➜ optional provider fields
              │
              ▼
       provider-native payload
              │
              ▼
       application provider client
```

The bridge never calls providers. It validates public input and emits the provider payload your backend will send.

## Field groups

### Core fields

Core fields are provider-agnostic product decisions. Common public examples:

- `request_prompt`
- `request_aspect_ratio`
- `request_output_format`
- `request_output_count`
- `request_input_assets`
- `request_duration_seconds`
- `request_resolution`
- `request_audio`
- `request_provider_order` with the public `fastest` sentinel

Core fields belong in `fields.core` and typically map through `mapCore`.

Duration, resolution, and audio are core because they can affect price, routing, or policy in the host application. `rosetta-bridge` does not perform billing, but it keeps those dimensions visible before dispatch just like BabySea's production refine schema keeps `generation_duration`, `generation_resolution`, and `generation_generate_audio` in shared input.

### Option fields

Option fields are public tuning knobs that may affect only some providers but should still have neutral names. Common public examples:

- `request_seed`
- `request_detail_level`
- `request_negative_prompt`
- `request_enhance_prompt`
- `request_moderation`

Option fields belong in `fields.options` and typically map through `mapOptions`.

## Adapter merge model

Default providers use flat merge semantics:

```text
provider_payload = {
  ...mapCore(full_normalized_request),
  ...mapOptions(full_normalized_request),
}
```

Both mappers receive the full normalized request context. This lets a flat provider field be computed from shared and optional inputs without turning it into a structured-payload exception.

`undefined` top-level values are stripped. Explicit `false`, `0`, `null`, empty strings, and empty arrays are preserved.

## Structured adapter exception

Some providers require nested payloads that cannot be assembled by flat merging. In those cases, use `mapStructured` and document why it is needed.

```typescript
const providerC = {
  mapStructured: (input) => ({
    content: [
      { type: 'text', text: input.request_prompt },
      { type: 'asset', url: Array.isArray(input.request_input_assets) ? input.request_input_assets[0] : undefined },
    ],
  }),
};
```

Use this only when the provider payload shape is inherently nested.

## Capability intersection

A public request schema should be safe for every registered provider. If any active provider cannot deliver a capability, do not expose it in the canonical schema.

| Capability | Rule |
|---|---|
| Aspect ratios | Use only ratios supported by every registered provider. |
| Output formats | Use only formats supported by every registered provider. |
| Input assets | `maxInputAssets` is the lowest provider max; `minInputAssets` is the highest provider min. |
| Duration | Only expose provider-accepted duration values. |
| Resolution/audio | Pricing-sensitive fields should stay in core fields so the application can inspect them before dispatch. |

The TypeScript helper `intersectValues(...)` exists for simple set intersections; complex provider semantics should still be reviewed by humans.

If a provider charges more for additional input assets while your product exposes flat pricing, the safe public max may be lower than the provider max. BabySea uses that pattern for flat-priced image models where cost predictability matters more than exposing every provider limit.

## Provider-order sentinel

`request_provider_order: 'fastest'` is a portable sentinel. In BabySea production, the route resolves the same idea through private routing layers before dispatch. In the OSS package, the bridge expands the sentinel to the configured concrete provider order; your backend can replace that with its own routing decision before calling `toProviderInput(...)`.

## Failure behavior

| Failure | Behavior |
|---|---|
| Missing required field | Throws `ValidationError` before adapter execution. |
| Unknown field | Throws `ValidationError` by default. |
| Unsupported enum/number value | Throws `ValidationError`. |
| Bad URL | Throws `ValidationError`. |
| Unsupported provider | Throws `ValidationError`. |
| Adapter returns `undefined` top-level value | Field is omitted from provider payload. |

URL fields are intentionally HTTP(S)-only. The TypeScript runtime rejects non-HTTP(S) URLs, the CLI-generated request schema emits the same pattern, and the versioned JSON Schemas mark URL defaults and canonical URL arrays with `^https?://`.

## Contract files

- [../schemas/bridge-definition.v1.json](../schemas/bridge-definition.v1.json) describes a portable bridge manifest without executable adapter functions.
- [../schemas/normalization-result.v1.json](../schemas/normalization-result.v1.json) describes the normalized debug/test envelope emitted by `convert(...)`.
