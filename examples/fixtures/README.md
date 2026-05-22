# rosetta-bridge fixtures

These fixtures make the request-normalization invariant inspectable without calling a provider.

They are intentionally synthetic. Keep real provider credentials, customer prompts, signed URLs, private provider IDs, route handlers, and production payloads out of fixture files.

| Fixture | Purpose |
|---|---|
| `bridge-definition.valid.json` | Portable public contract with two placeholder providers. |
| `bridge-definition.executable.mjs` | Executable companion used by the CLI `map` command because provider adapters are functions. |
| `request.valid-minimal.json` | Minimal valid request; defaults fill ratio, format, input assets, and moderation. |
| `request.valid-with-defaults.json` | Valid request that relies on declared defaults. |
| `request.valid-provider-mapping.json` | Valid request used by the expected Provider A/B payload fixtures. |
| `request.invalid-unknown-field.json` | Must fail strict validation with `unknown_field`. |
| `request.invalid-url.json` | Must fail URL-array validation. |
| `request.invalid-unsupported-enum.json` | Must fail enum validation for unsupported output format. |
| `provider-a-payload.expected.json` | Expected provider-native payload for Provider A. |
| `provider-b-payload.expected.json` | Expected provider-native payload for Provider B, including `jpg` to `jpeg` mapping. |
| `bridge-definition.union-capability.invalid.json` | Review fixture for a bridge that exposes a capability not safe for every fallback provider. |

The JSON manifest cannot serialize executable TypeScript adapter functions. Use it as the portable schema contract, then pair it with adapter tests in `client/typescript`.

Use the executable fixture only in trusted local or CI environments; CLI mapping runs JavaScript adapter code.

CLI examples after building the TypeScript client:

```bash
cd ../../client/typescript
npm run build

node dist/cli.mjs validate ../../examples/fixtures/bridge-definition.valid.json \
	../../examples/fixtures/request.valid-minimal.json

node dist/cli.mjs schema ../../examples/fixtures/bridge-definition.valid.json

node dist/cli.mjs map ../../examples/fixtures/bridge-definition.executable.mjs \
	../../examples/fixtures/request.valid-provider-mapping.json \
	--provider provider_b
```
