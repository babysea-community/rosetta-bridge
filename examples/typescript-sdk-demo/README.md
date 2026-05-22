# TypeScript SDK demo

This directory is a small repository-local demo for defining a public request schema and converting it into provider payloads.

The demo stays inside the public Rosetta boundary: placeholder providers, lowercase snake-case `request_*` fields, no provider credentials, no hosted routes, and no provider SDK calls.

Run it from a checked-out repository after installing the SDK dependencies:

```bash
cd ../../client/typescript
npm install
npm run build
```

The demo imports the workspace source so editors can type-check it without publishing the package first. In an application, import from `rosetta-bridge` after installing the built SDK.

Use this example to verify:

- strict public input validation;
- declared defaults;
- provider-native payload mapping;
- private provider names and credentials staying outside customer input.
