# rosetta-bridge TypeScript SDK

TypeScript primitives for declaring public request fields, validating customer input, and converting that input into provider-native payloads. Portable manifests and result envelopes are represented as JSON Schema Draft 2020-12 contracts.

## Runtime boundary

Use this package from trusted backend code before provider dispatch. It does not include auth middleware, persistence, billing, queues, provider SDK calls, hosted routes, webhooks, telemetry, or secret storage.

## Install from source

Runtime targets Node.js 18+. Local development and tests use the Vitest/Vite toolchain and require Node.js 20.19+ or 22.12+.

```bash
cd client/typescript
npm install
npm run build

cd /path/to/your-app
npm install /path/to/rosetta-bridge/client/typescript
```

## Contract

- The package scope is TypeScript runtime code plus JSON Schema contracts only.
- `RosettaBridge.normalize(...)` validates strict canonical input and applies defaults.
- `RosettaBridge.toCanonicalInput(...)` returns canonical input and includes omitted option fields as `null` by default for complete debug/test shapes.
- `RosettaBridge.toProviderInput(...)` converts canonical fields into one provider payload.
- `RosettaBridge.convert(...)` returns a `normalization-result.v1` envelope with canonical input, provider order, and provider payload.
- `mapCore` and `mapOptions` receive the full normalized request context so flat provider fields can be computed from shared inputs.
- `mapStructured` is the explicit escape hatch for providers that require nested payload assembly.
- Shared media helpers keep duration, resolution, audio mode, and input-asset limits in core fields so host applications can inspect pricing-sensitive dimensions before dispatch.
- URL fields are HTTP(S)-only in both runtime validation and JSON Schema output.
- Authentication, persistence, billing, provider SDK calls, queues, and webhooks belong to the host application.

## Basic usage

```typescript
import { RosettaBridge, sharedMediaFields } from 'rosetta-bridge';

const bridge = new RosettaBridge({
	schemaVersion: 'bridge-definition.v1',
	modelId: 'example/media-model',
	supportedProviders: ['provider_a', 'provider_b'],
	providerOrder: ['provider_a', 'provider_b'],
	fields: {
		core: sharedMediaFields({
			supportedAspectRatios: ['1:1', '16:9'],
			supportedFormats: ['png', 'jpg'],
			defaultAspectRatio: '1:1',
			defaultFormat: 'png',
		}),
		options: {
			request_seed: { type: 'integer' },
		},
	},
	providers: {
		provider_a: {
			mapCore: (input) => ({
				prompt: input.request_prompt,
				aspect_ratio: input.request_aspect_ratio,
				format: input.request_output_format,
			}),
			mapOptions: (input) => ({ seed: input.request_seed }),
		},
		provider_b: {
			mapCore: (input) => ({
				text: input.request_prompt,
				aspect: input.request_aspect_ratio,
				output_format: input.request_output_format === 'jpg' ? 'jpeg' : input.request_output_format,
			}),
		},
	},
});

const payload = bridge.toProviderInput(
	{
		request_prompt: 'a glass sculpture on a bridge',
		request_output_format: 'jpg',
		request_seed: 123,
	},
	'provider_b',
);
```

## API surface

- `new RosettaBridge(definition)` / `createRosettaBridge(definition)` construct a validated bridge definition.
- `normalize(input, options?)` returns normalized public input or throws `ValidationError`.
- `toCanonicalInput(input, options?)` returns normalized input with omitted option fields filled as `null` by default. Use `{ includeNullOptionFields: false }` when storing canonical input that will be fed back into validation or provider mapping.
- `toProviderInput(input, provider)` validates input and returns one provider-native payload.
- `convert(input, provider)` returns a `normalization-result.v1` envelope.
- `providerOrder(input?)`, `supportedProviders()`, and `describe()` expose bridge metadata for host applications and CLI output.

## Helpers

- `sharedMediaFields(config)` builds common media core fields: prompt, aspect ratio, output format/count, input assets, duration, resolution, audio, and provider order.
- `intersectValues(...sets)` and `sortAspectRatios(ratios)` help author provider-intersection capabilities.
- `enhancePromptToBoolean()`, `enhancePromptToMode()`, `enhancePromptToObject()`, and `enhancePromptToOnOff()` map `request_enhance_prompt` into provider-native helper shapes.
- `moderationToDisableBoolean()`, `moderationToEnableBoolean()`, `moderationToTolerance()`, `moderationToToleranceString()`, and `moderationToMode()` map `request_moderation` into provider-native moderation shapes.
- `PROVIDER_ORDER_FASTEST` is the public `fastest` sentinel.

## CLI

```bash
npm run build

node dist/cli.mjs validate ../../examples/fixtures/bridge-definition.valid.json \
	../../examples/fixtures/request.valid-minimal.json

node dist/cli.mjs schema ../../examples/fixtures/bridge-definition.valid.json

node dist/cli.mjs map ../../examples/fixtures/bridge-definition.executable.mjs \
	../../examples/fixtures/request.valid-provider-mapping.json \
	--provider provider_b
```

JSON manifests can validate requests and emit request schemas. Mapping requires a trusted executable bridge module because provider adapters are JavaScript functions.

## Verification

```bash
npm run lint
npm test
npm run build
```

See the repository `README.md` for the full normalization model.
