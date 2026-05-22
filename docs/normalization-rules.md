# Normalization rules

This guide defines the public `rosetta-bridge` schema discipline. It is intentionally generic: use placeholder provider IDs, neutral request names, and public examples in open-source code.

The rules are validated against BabySea's internal production schema pipeline: provider contracts are recorded separately, one strict customer-facing schema is exposed, defaults are declared in the public schema, and provider-native payloads are emitted only after validation. The OSS package implements that boundary with TypeScript adapters and JSON Schema contracts only; backend auth, billing, persistence, webhooks, provider SDK calls, and routing services are application-owned.

## 0. Use the TypeScript + JSON contract honestly

- Field specs and adapters are TypeScript.
- Portable manifests and normalization-result envelopes are JSON Schema Draft 2020-12.
- Public field names are lowercase snake-case `request_*` names.
- Do not describe billing providers, databases, queues, auth, or provider clients as part of this package unless your application adds those layers around it.
- If a production BabySea behavior is outside this TypeScript + JSON boundary, keep it out of the OSS primitive.
- The portable JSON manifest is not a raw provider schema. Provider-native names, defaults, excluded fields, credentials, callback URLs, and private routing state belong in trusted adapter code or private integration notes.

## 1. Record provider contracts separately

Provider fields should be copied from provider documentation without changing names, defaults, bounds, enum values, or types. If a provider exposes a field you intentionally do not support, document the field as excluded with a reason in your integration notes or source comments.

Examples of valid exclusion reasons:

- The application controls webhooks server-side.
- The application uses async dispatch instead of provider sync mode.
- The public schema uses aspect ratios instead of raw pixel width/height.
- The field would expose credentials, callback URLs, or internal routing state.

Some provider fields should be excluded from every public bridge regardless of product. Treat the following as always-excluded and hard-code the safe value inside the adapter (or omit the field entirely):

| Provider field | Reason | Adapter behavior |
|---|---|---|
| Auto-rewrite/`auto_fix`-style flags | Auto-rewriting prompts that violate provider policy is almost always desirable and should not be a customer toggle. | Hard-code on inside the adapter; never expose as a `request_*` field. |
| `webhook_url`, `webhook_secret`, callback signing keys | Webhooks belong to the host application's backend, not to customer input. | Omit from the adapter payload; configure server-side. |
| API keys, account IDs, region routing hints | Credentials and routing state must never leave the trusted backend. | Inject from server-side config; never accept from `request_*`. |

Do not publish private provider configuration in this primitive.

## 2. Public fields are customer-facing

Expose one neutral `request_*` field per product concept. Do not expose provider naming differences to customers.

| Concept | Public field | Provider adapter examples |
|---|---|---|
| Prompt | `request_prompt` | `prompt`, `text` |
| Aspect ratio | `request_aspect_ratio` | `aspect_ratio`, `size`, width/height fields |
| Output format | `request_output_format` | `output_format`, `format` |
| Input assets | `request_input_assets` | `image`, `asset_url`, `assets` |
| Optional detail level | `request_detail_level` | `detail`, `quality`, provider-specific scale |
| Prompt enhancement | `request_enhance_prompt` | enhancement mode, prompt optimizer flag |
| Moderation | `request_moderation` | enable/disable safety checker, tolerance setting |

## 3. Core fields and option fields stay distinct

- Put product-level fields in `fields.core`.
- Put tuning knobs in `fields.options`.
- Map common provider fields in `mapCore`.
- Map optional provider fields in `mapOptions`.
- Both mappers receive the full normalized request context.
- Use `mapStructured` only when a provider payload requires nested assembly.

This keeps pricing, persistence, UI generation, and provider conversion readable without leaking provider-only names into customer input.

**Authoring convention.** Inside `mapCore`, return keys in the same canonical order as the public `request_*` fields (prompt → aspect ratio → output format → output count → input assets → duration → resolution → audio → provider order). Inside `mapOptions`, return keys alphabetically. The runtime does not enforce key order, but a consistent order makes diffs, code review, and grep-by-field across many adapters readable as the bridge count grows.

## 4. Intersections beat unions

The public schema must be safe under failover. Use the intersection of provider capabilities, not the union.

```typescript
import { intersectValues, sortAspectRatios } from 'rosetta-bridge';

const supportedFormats = intersectValues(['png', 'jpg', 'webp'], ['png', 'jpg']);
const supportedRatios = sortAspectRatios(intersectValues(['1:1', '16:9', '9:16'], ['1:1', '16:9']));
```

If one provider is missing a pricing-sensitive capability such as a resolution tier, do not register that provider for the same bridge unless the product can safely hide or compensate for that capability.

## 5. Ratios stay canonical

Customer input should use named ratios such as `1:1`, `9:16`, and `16:9`. If a provider requires pixels, convert ratios inside that provider adapter.

```typescript
const sizeMap = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1344, height: 768 },
};

const adapter = {
  mapCore: (input) => ({
    prompt: input.request_prompt,
    ...sizeMap[String(input.request_aspect_ratio) as keyof typeof sizeMap],
  }),
};
```

## 6. Pricing-sensitive dimensions are core

`rosetta-bridge` does not charge money or credits. It still preserves BabySea's production invariant that fields affecting cost, routing, or policy are public core fields, not hidden provider options.

| Product dimension | Public field | `sharedMediaFields(...)` config | Adapter responsibility |
|---|---|---|---|
| Duration | `request_duration_seconds` | `durationValues` | Convert to each provider's native number/string/`s`-suffix format. |
| Resolution | `request_resolution` | `supportedResolutions`, `defaultResolution` | Keep values intersection-safe and map provider-specific names or size maps. |
| Audio mode | `request_audio` | `supportsAudio` | Map to provider audio fields and let the host billing layer derive audio/no-audio mode. |
| Input assets | `request_input_assets` | `maxInputAssets`, `minInputAssets` | Use the lowest safe max and highest required min across providers. |

If a provider supports more inputs or higher resolutions than the product can safely expose under its pricing model, cap the public field and document the exclusion. Do not rely on provider errors after dispatch.

## 7. Defaults are public, not accidental

Provider defaults may differ. Declare the default you want customers to get in the public field spec.

Recommended public defaults:

- `request_output_count`: `1`
- `request_audio`: `false` when audio changes price
- `request_moderation`: `false` when the product wants the most permissive creative default, or `true` when the product policy requires moderation by default
- `request_enhance_prompt`: `off` unless the product explicitly opts in
- `request_provider_order`: `fastest` when the application will resolve the best available provider before dispatch

Do not add a default for required creative choices such as duration when the user should make that choice.

## 8. Normalize provider-specific tuning helpers

BabySea exposes public tuning concepts once, then adapters translate them per provider. The OSS helper names mirror that pattern with public `request_*` fields:

- `request_enhance_prompt: 'off' | 'standard' | 'fast'` can map to booleans, provider mode strings, objects such as `{ mode }`, or `On`/`Off` fields.
- `request_moderation: boolean` can map to inverted disable flags, passthrough enable flags, strict/permissive tolerance values, or provider mode strings.

Keep those fields in `fields.options` unless your host application treats them as price, routing, or policy dimensions.

## 9. Validate before dispatch

`normalize(...)` is strict by default. Unknown fields, unsupported enum values, bad URLs, missing required fields, and out-of-range numbers fail before any provider call can be made.

URL fields are HTTP(S)-only in the TypeScript runtime and JSON Schema contracts. Use `url` for single customer-supplied URLs and `url-array` for media arrays.

## 10. Persist canonical envelopes deliberately

`toCanonicalInput(...)` emits `null` for omitted option fields by default. This mirrors the complete schema shape and makes debug envelopes, API responses, and docs easier to compare.

Use `includeNullOptionFields: false` if you need a compact object or a stored canonical input that will be fed back into `normalize(...)` or `toProviderInput(...)`. If a stored envelope came from `convert(...)`, strip null-only omitted option fields before replay.

## 11. Version contracts

Public JSON Schemas are versioned. Breaking changes should add v2 files and keep v1 available for existing consumers.

Current contracts:

- `bridge-definition.v1`
- `normalization-result.v1`
