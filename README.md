<div align="center">

<img src="public/icon.png" width="100" alt="Rosetta Bridge icon" />

# Rosetta Bridge

Request normalization engine for multi-provider inference workloads.

### One request. Many dialects. No silent schema.

<br />

<strong>Project details</strong>

[![BabySea Blog](https://custom-icon-badges.demolab.com/badge/read-blog-0D9488?style=for-the-badge&logo=babysea&logoColor=white)](https://babysea.ai/blog/how-babysea-built-strict-request-normalization-with-json-schema-and-typescript)
[![BabySea OSS Primitive](https://custom-icon-badges.demolab.com/badge/oss-primitive-EA580c?style=for-the-badge&logo=babysea&logoColor=white)](#babysea-oss-taxonomy)
[![BabySea OSS Status Production](https://custom-icon-badges.demolab.com/badge/status-production-C026D3?style=for-the-badge&logo=babysea&logoColor=white)](#status)
[![License](https://custom-icon-badges.demolab.com/badge/license-apache_2.0-059669?style=for-the-badge&logo=apache&logoColor=white)](LICENSE)

<br/>

<strong>Checks</strong>

[![GitLabCI](https://img.shields.io/gitlab/pipeline-status/babysea/rosetta-bridge?branch=main&style=for-the-badge&label=gitlabci&logo=gitlab&logoColor=white&color=FC6D26)](https://gitlab.com/babysea/rosetta-bridge/-/commits/main)
[![Codecov](https://img.shields.io/codecov/c/github/babysea-community/rosetta-bridge?style=for-the-badge&label=codecov&logo=codecov&logoColor=white&color=FF0077&token=R8UcQFs7mx)](https://codecov.io/github/babysea-community/rosetta-bridge)
[![CodeQL](https://img.shields.io/github/actions/workflow/status/babysea-community/rosetta-bridge/codeql.yml?style=for-the-badge&label=codeql&logo=github&logoColor=white)](https://github.com/babysea-community/rosetta-bridge/actions/workflows/codeql.yml)
[![Package](https://img.shields.io/github/actions/workflow/status/babysea-community/rosetta-bridge/package-check.yml?style=for-the-badge&label=package&logo=npm&logoColor=white)](https://github.com/babysea-community/rosetta-bridge/actions/workflows/package-check.yml)

<br/>

<strong>Built with</strong>

[![JSON Schema](https://img.shields.io/badge/json_schema-000000?style=for-the-badge&logo=json&logoColor=white)](https://json-schema.org)
[![TypeScript](https://img.shields.io/badge/typescript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Provider Adapters](https://custom-icon-badges.demolab.com/badge/provider_adapters-4E56A6?style=for-the-badge&logo=plug&logoColor=white)](#5-architecture)

<br/>

<img src="public/card.png" alt="Rosetta Bridge card" />

</div>

<br/>

## BabySea OSS taxonomy

BabySea open source projects are organized into three categories:

[![BabySea OSS SDK](https://custom-icon-badges.demolab.com/badge/oss-sdk-7C3AED?style=for-the-badge&logo=babysea&logoColor=white)](#babysea-oss-taxonomy)
[![BabySea OSS Primitive](https://custom-icon-badges.demolab.com/badge/oss-primitive-EA580c?style=for-the-badge&logo=babysea&logoColor=white)](#babysea-oss-taxonomy)
[![BabySea OSS Starter](https://custom-icon-badges.demolab.com/badge/oss-starter-2563EB?style=for-the-badge&logo=babysea&logoColor=white)](#babysea-oss-taxonomy)

| Category      | Description                                                                                                                                       |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| **SDK**       | Typed developer entry points for creating, tracking, and managing BabySea workloads from application code.                                        |
| **Primitive** | Reusable infrastructure boundaries extracted from BabySea's execution control plane. Each primitive focuses on one system concern.                |
| **Starter**   | Deployable reference applications that combine product UI, auth, storage, and BabySea execution patterns. Some starters may also include billing. |

## Status

BabySea OSS projects are published into three status levels:

[![BabySea OSS Status Working](https://custom-icon-badges.demolab.com/badge/status-working-DB2777?style=for-the-badge&logo=babysea&logoColor=white)](#status)
[![BabySea OSS Status Production](https://custom-icon-badges.demolab.com/badge/status-production-C026D3?style=for-the-badge&logo=babysea&logoColor=white)](#status)
[![BabySea OSS Status Alpha](https://custom-icon-badges.demolab.com/badge/status-alpha-D97706?style=for-the-badge&logo=babysea&logoColor=white)](#status)

| Status         | Description                                                                                                                                                                          |
| :------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Working**    | Fully implemented and deployable. All documented capabilities function as described. Suitable for personal and small-team use. No breaking-change guarantees between versions.       |
| **Production** | Working plus a hardened public runtime contract. Validated against a stated infrastructure stack with deterministic behavior, explicit failure modes, and a documented upgrade path. |
| **Alpha**      | Early-stage implementation. Core structure exists but some capabilities may be incomplete, undocumented, or subject to breaking changes. Not recommended for production deployments. |

See [`CHANGELOG.md`](CHANGELOG.md) to track releases and public contract changes.

## Table of contents

1. [Overview](#1-overview)
    - [What this is](#what-this-is)
    - [Short version](#short-version)
    - [Production lineage](#production-lineage)
    - [Grounding rule](#grounding-rule)
    - [Adoption path](#adoption-path)
2. [Stack contract](#2-stack-contract)
3. [Terminology](#3-terminology)
4. [Boundaries](#4-boundaries)
5. [Architecture](#5-architecture)
6. [Quick start](#6-quick-start)
    - [Build the TypeScript SDK](#build-the-typescript-sdk)
    - [Define a public schema](#define-a-public-schema)
    - [Map provider payloads](#map-provider-payloads)
    - [Use the CLI](#use-the-cli)
7. [Core capabilities](#7-core-capabilities)
    - [Why it's different](#why-its-different)
    - [The bug this prevents](#the-bug-this-prevents)
    - [Core invariants](#core-invariants)
    - [Production-derived schema discipline](#production-derived-schema-discipline)
    - [Pricing-sensitive core fields](#pricing-sensitive-core-fields)
    - [Fail-before-dispatch by design](#fail-before-dispatch-by-design)
8. [Version surface](#9-version-surface)
9. [Security and Compliance](#10-security-and-compliance)
10. [Community](#11-community)
    - [Who's using it](#whos-using-it)
    - [Related projects](#related-projects)
    - [Contributing](#contributing)
11. [License](#12-license)

---

## 1. Overview

### What this is

`rosetta-bridge` is a request normalization primitive for teams integrating multiple media providers behind one product API. It validates a strict public request shape, applies declared defaults, and converts the normalized request into provider-native payloads at dispatch time.

The public package is intentionally scoped to TypeScript adapters and JSON Schema contracts. Auth, billing, persistence, queues, provider clients, webhooks, credit settlement, and routing intelligence stay in your application.

### Short version

Provider APIs drift. `rosetta-bridge` gives you one stable `request_*` schema and keeps provider-native field names inside adapters, so a fallback provider cannot silently change request semantics after validation.

### Production lineage

The primitive mirrors BabySea's production schema-hardening boundary: provider contracts are represented outside the customer request, strict public fields are validated with unknown-field rejection, defaults are declared in one place, canonical input can be persisted by the host after validation, and provider-native payloads are emitted through explicit mappers.

### Grounding rule

Public OSS behavior is limited to the TypeScript + JSON boundary implemented here: field specs, strict normalization, defaults, capability intersections, provider-order sentinels, prompt-enhancement helpers, moderation helpers, pricing-sensitive core fields, URL validation, canonical envelopes, and provider adapters. Hosted routes, private catalogs, credentials, provider SDK calls, queues, billing, telemetry, and Databricks routing are out of scope.

### Adoption path

Define a public bridge manifest, keep provider-specific mapping inside adapters, cover the manifest with fixtures, and call `normalize()`/`toProviderInput()` before enqueueing or dispatching. You bring your backend, provider clients, database, billing, and runtime. The bridge handles schema safety.

## 2. Stack contract

| Layer                | Required stack                                        | Runtime responsibility                                                                                     |
| :------------------- | :---------------------------------------------------- | :--------------------------------------------------------------------------------------------------------- |
| Provider contract    | Provider docs, OpenAPI, JSON Schema, or typed notes   | Record the external provider shape and intentional exclusions outside the public request.                   |
| Public request schema | `rosetta-bridge` field specs                         | Validate input, apply defaults, reject unknown fields, and keep provider-only names out of customer APIs.  |
| Provider adapter     | TypeScript mapper functions                           | Convert normalized request fields into one provider-native payload.                                        |
| Public contract      | JSON Schema Draft 2020-12                             | Version bridge manifests and normalization-result envelopes for docs, SDKs, and tests.                     |
| Integration boundary | Your backend, database, billing, queues, and SDKs     | Own auth, persistence, rate limits, provider calls, webhooks, and dispatch outside the bridge.             |

No hosted gateway, provider execution, queue worker, billing system, or routing service is part of this version contract.

## 3. Terminology

| Term                    | Meaning in this package                                                                                                               |
| :---------------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| Core field              | Provider-agnostic request field such as `request_prompt`, `request_aspect_ratio`, `request_output_format`, or `request_duration_seconds`. |
| Option field            | Public tuning field such as `request_seed`, `request_negative_prompt`, `request_enhance_prompt`, or `request_guidance_scale`.         |
| Provider field          | Provider-native API field. Provider names stay inside adapters, not in the public request schema.                                      |
| Provider adapter        | Converter with `mapCore`, `mapOptions`, and optional `mapStructured` functions.                                                        |
| Structured adapter      | Explicit exception for providers whose payload must be assembled as nested objects or arrays.                                          |
| Provider-order sentinel | `request_provider_order: 'fastest'` expands to the bridge's default provider order; the host application still chooses the active provider before dispatch. |
| Intersection            | The safe overlap of capabilities across active providers: ratios, formats, input limits, duration, resolution, audio, and other pricing dimensions. |

## 4. Boundaries

- Not a hosted inference gateway or provider router.
- Not BabySea's private model catalog, provider configuration, credentials, or routing code.
- Not a replacement for authorization, billing, rate limiting, persistence, queues, or webhooks.
- Not a code generator for every provider API.
- Not a runtime guarantee that providers keep their public APIs stable; adapter fixtures must cover the contract you depend on.

## 5. Architecture

```text
Customer request
  |
  v
RosettaBridge.normalize()
  | strict validation + declared defaults
  v
Canonical request envelope
  |- mapCore(...)       common provider fields
  |- mapOptions(...)    optional public tuning fields
  `- mapStructured(...) explicit nested-payload exception
        |
        v
Provider-native payload
        |
        v
Your provider SDK / route handler
```

For the full design, see [`docs/architecture.md`](docs/architecture.md) and [`docs/normalization-rules.md`](docs/normalization-rules.md). Fixture examples live in [`examples/fixtures/`](examples/fixtures).

## 6. Quick start

### Build the TypeScript SDK

```bash
git clone https://github.com/babysea-community/rosetta-bridge
cd rosetta-bridge/client/typescript
npm install
npm run build

cd /path/to/your-app
npm install /path/to/rosetta-bridge/client/typescript
```

Runtime targets Node.js 22+. Local development and tests use the Vitest/Vite toolchain and require Node.js 22.12+.

### Define a public schema

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
      providerOrders: ['fastest', 'provider_a,provider_b', 'provider_b,provider_a'],
      defaultProviderOrder: 'fastest',
    }),
    options: {
      request_detail_level: {
        type: 'enum',
        values: ['standard', 'high'],
        default: 'standard',
      },
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
      mapOptions: (input) => ({
        detail: input.request_detail_level,
        seed: input.request_seed,
      }),
    },
    provider_b: {
      mapCore: (input) => ({
        text: input.request_prompt,
        aspect: input.request_aspect_ratio,
        output_format:
          input.request_output_format === 'jpg'
            ? 'jpeg'
            : input.request_output_format,
      }),
      mapOptions: (input) => ({
        detail: input.request_detail_level,
        seed: input.request_seed,
      }),
    },
  },
});
```

### Map provider payloads

```typescript
const providerPayload = bridge.toProviderInput(
  {
    request_prompt: 'a glass sculpture on a bridge',
    request_aspect_ratio: '16:9',
    request_output_format: 'jpg',
    request_seed: 123,
  },
  'provider_b',
);
```

Provider adapters keep native names private. One provider can receive `aspect_ratio`, another can receive `aspect`, and the public request stays the same.

### Use the CLI

The package ships a CLI for portable contract checks and fixture smoke tests:

```bash
cd client/typescript
npm run build

node dist/cli.mjs validate ../../examples/fixtures/bridge-definition.valid.json \
  ../../examples/fixtures/request.valid-minimal.json

node dist/cli.mjs schema ../../examples/fixtures/bridge-definition.valid.json

node dist/cli.mjs map ../../examples/fixtures/bridge-definition.executable.mjs \
  ../../examples/fixtures/request.valid-provider-mapping.json \
  --provider provider_b
```

JSON bridge manifests can validate requests and emit request JSON Schema. Mapping requires an executable JavaScript bridge module because provider adapters are functions.

## 7. Core capabilities

### Why it's different

Provider integrations fail when equivalent request fields drift across vendors. `rosetta-bridge` makes that drift explicit at the adapter boundary and rejects unsafe input before dispatch.

| Problem                                | How `rosetta-bridge` solves it                                                                 |
| :------------------------------------- | :---------------------------------------------------------------------------------------------- |
| **Schema drift.**                      | Expose one public `request_*` field and map it per provider.                                     |
| **Failover breaks semantics.**         | Author public capabilities from the provider intersection, not the union.                        |
| **Mappers become unreadable.**         | Separate common fields in `mapCore` from tuning fields in `mapOptions`.                          |
| **Nested payloads need exceptions.**   | Use `mapStructured` only when flat core/options mapping cannot express the provider payload.      |
| **Unknown fields sneak through.**      | Strict normalization rejects undeclared public fields before provider dispatch.                   |
| **Provider defaults vary.**            | Public defaults live in field specs instead of being inherited silently from providers.           |

### The bug this prevents

One request can mean different things to different providers:

- Provider A accepts `jpg`; Provider B requires `jpeg`.
- Provider A calls the field `aspect_ratio`; Provider B calls it `aspect`.
- Provider A enables safety by default; Provider B disables it by default.
- Provider A supports `16:9`; the fallback provider only supports `1:1`.

Without a normalization boundary, failover can change semantics after validation. With `rosetta-bridge`, those differences are declared in field specs, enum mappings, intersection helpers, and adapter fixtures before any provider call happens.

### Core invariants

1. Record provider-native shape outside the public request.
2. Expose one strict public `request_*` schema.
3. Declare defaults in field specs, not inside provider adapters.
4. Author capability intersections from every active fallback provider.
5. Keep pricing-sensitive dimensions in core fields.
6. Use structured mapping only for explicit nested-payload exceptions.
7. Reject unknown fields, invalid URLs, unsupported enums, and out-of-bound numbers before dispatch.
8. Version every breaking public-contract change as a new schema version.

### Production-derived schema discipline

| BabySea production rule                         | `rosetta-bridge` rule                                                                                  |
| :---------------------------------------------- | :----------------------------------------------------------------------------------------------------- |
| Raw provider schema mirrors provider docs.      | Keep provider-native fields in adapter code or integration notes.                                      |
| Refined schema is strict and customer-facing.   | `normalize(...)` rejects unknown fields and accepts only declared `request_*` fields.                   |
| Defaults live in the refined public schema.     | Field specs own defaults; adapters do not inherit provider defaults silently.                           |
| Capability intersections protect failover.      | Ratios, formats, input limits, duration, resolution, and audio must be safe for every registered provider. |
| Core pricing fields stay inspectable.           | Duration, resolution, audio, and input assets remain core fields before billing or routing decisions.   |
| Provider-specific tuning maps after core fields. | `mapOptions(...)` owns knobs such as seed, moderation, prompt enhancement, and negative prompt.         |

### Pricing-sensitive core fields

`rosetta-bridge` does not bill customers, but it preserves the invariant that fields affecting cost must be visible before dispatch:

- `request_duration_seconds` for duration-priced models.
- `request_resolution` for resolution-priced models.
- `request_audio` for audio/no-audio pricing modes.
- `request_input_assets` for models where input count or type affects cost.

Adapters may rename or type-convert those values, but the host application can inspect them before queues, provider SDK calls, or billing decisions.

### Fail-before-dispatch by design

| Failure                                      | Behavior                                                                 |
| :------------------------------------------- | :----------------------------------------------------------------------- |
| Missing required field                       | Throws `ValidationError` before adapter execution.                       |
| Unknown public field                         | Throws `ValidationError` by default.                                     |
| Unsupported enum or number value             | Throws `ValidationError`.                                                |
| Invalid URL in asset fields                  | Throws `ValidationError`.                                                |
| Unsupported provider                         | Throws `ValidationError`.                                                |
| Adapter returns a top-level `undefined` value | Omits that provider field while preserving `false`, `0`, `null`, and empty values. |

Run the bridge before enqueueing or dispatch so downstream systems consume only validated canonical requests.

## 8. Version surface

Current version surface:

- [x] Strict public `request_*` validation and declared defaults
- [x] TypeScript provider adapters with `mapCore`, `mapOptions`, and `mapStructured`
- [x] Capability helpers for simple intersections and aspect-ratio ordering
- [x] JSON Schemas for `bridge-definition.v1` and `normalization-result.v1`
- [x] Fixture-driven examples for valid, defaulted, invalid, and provider-mapping cases
- [x] TypeScript SDK with tests
- [x] Architecture and normalization-rule documentation

Future provider clients, hosted routes, billing, queues, telemetry, and routing services stay outside the public contract unless implemented and validated as separate packages.

## 9. Security and Compliance

Rosetta Bridge publishes its trust signals through public GitLab and GitHub checks so contributors can inspect the actual CI configuration, jobs, and reports.

## 10. Community

### Who's using it

- **[BabySea](https://babysea.ai)**: execution control plane for generative media.

*Using `rosetta-bridge`? Open a PR to add yourself.*

### Contributing

We welcome PRs, issues, and design discussion. See [`CONTRIBUTING.md`](CONTRIBUTING.md), [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md), and [`SECURITY.md`](SECURITY.md).

## 11. License

[Apache License 2.0](LICENSE). Use it, fork it, ship it.
