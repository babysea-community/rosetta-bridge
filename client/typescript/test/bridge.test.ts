/**
 * Copyright 2026 BabySea, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  RosettaBridge,
  ValidationError,
  enhancePromptToBoolean,
  enhancePromptToMode,
  enhancePromptToObject,
  enhancePromptToOnOff,
  intersectValues,
  moderationToDisableBoolean,
  moderationToEnableBoolean,
  moderationToMode,
  moderationToTolerance,
  moderationToToleranceString,
  PROVIDER_ORDER_FASTEST,
  sharedMediaFields,
  sortAspectRatios,
  type BridgeDefinition,
} from '../src/index';

type JsonObject = Record<string, unknown>;

const currentDirectory = dirname(fileURLToPath(import.meta.url));

const demoDefinition: BridgeDefinition = {
  fields: {
    core: sharedMediaFields({
      defaultAspectRatio: '1:1',
      defaultFormat: 'png',
      defaultProviderOrder: PROVIDER_ORDER_FASTEST,
      maxInputAssets: 1,
      providerOrders: [PROVIDER_ORDER_FASTEST, 'provider_a,provider_b', 'provider_b,provider_a'],
      supportedAspectRatios: ['1:1', '16:9'],
      supportedFormats: ['png', 'jpg'],
    }),
    options: {
      request_detail_level: { default: 'standard', type: 'enum', values: ['standard', 'high'] },
      request_enhance_prompt: { default: 'off', type: 'enum', values: ['off', 'standard', 'fast'] },
      request_moderation: { default: false, type: 'boolean' },
      request_seed: { type: 'integer' },
    },
  },
  metadata: {
    public_name: 'demo-media',
  },
  modelId: 'example/media-model',
  providerOrder: ['provider_a', 'provider_b'],
  providers: {
    provider_a: {
      mapCore: (input) => ({
        aspect_ratio: input.request_aspect_ratio,
        image: Array.isArray(input.request_input_assets) ? input.request_input_assets[0] : undefined,
        output_format: input.request_output_format,
        prompt: input.request_prompt,
      }),
      mapOptions: (input) => ({
        disable_safety_checker: moderationToDisableBoolean(input),
        detail: input.request_detail_level,
        seed: input.request_seed,
      }),
    },
    provider_b: {
      mapCore: (input) => ({
        aspect: input.request_aspect_ratio,
        image_url: Array.isArray(input.request_input_assets) ? input.request_input_assets[0] : undefined,
        num_outputs: input.request_output_count,
        output_format: input.request_output_format === 'jpg' ? 'jpeg' : input.request_output_format,
        prompt: input.request_prompt,
      }),
      mapOptions: (input) => ({
        canvas_size: `${String(input.request_aspect_ratio)}:${String(input.request_detail_level)}`,
        enable_safety_checker: moderationToEnableBoolean(input),
        seed: input.request_seed,
      }),
    },
  },
  schemaVersion: 'bridge-definition.v1',
  supportedProviders: ['provider_a', 'provider_b'],
};

const bridge = new RosettaBridge(demoDefinition);

describe('RosettaBridge', () => {
  it('normalizes canonical input and applies defaults', () => {
    const normalized = bridge.normalize({ request_prompt: 'a glass penguin' });

    expect(normalized).toMatchObject({
      request_aspect_ratio: '1:1',
      request_detail_level: 'standard',
      request_enhance_prompt: 'off',
      request_input_assets: [],
      request_moderation: false,
      request_output_count: 1,
      request_output_format: 'png',
      request_prompt: 'a glass penguin',
      request_provider_order: 'fastest',
    });
    expect(normalized).not.toHaveProperty('request_seed');
  });

  it('emits nulls for optional fields in canonical envelopes', () => {
    const canonicalInput = bridge.toCanonicalInput({ request_prompt: 'a crystal bridge' });

    expect(canonicalInput.request_seed).toBeNull();
    expect(canonicalInput.request_detail_level).toBe('standard');
  });

  it('converts to provider-native payloads with core and option boundaries', () => {
    const payload = bridge.toProviderInput(
      {
        request_aspect_ratio: '16:9',
        request_input_assets: ['https://example.com/input.png'],
        request_moderation: true,
        request_output_format: 'jpg',
        request_prompt: 'a blue whale',
        request_seed: 123,
      },
      'provider_b',
    );

    expect(payload).toEqual({
      aspect: '16:9',
      canvas_size: '16:9:standard',
      enable_safety_checker: true,
      image_url: 'https://example.com/input.png',
      num_outputs: 1,
      output_format: 'jpeg',
      prompt: 'a blue whale',
      seed: 123,
    });
  });

  it('lets option mappers read the full normalized request context', () => {
    const payload = bridge.toProviderInput(
      {
        request_aspect_ratio: '16:9',
        request_detail_level: 'high',
        request_prompt: 'a wide scene',
      },
      'provider_b',
    );

    expect(payload.canvas_size).toBe('16:9:high');
  });

  it('strips undefined provider fields without dropping explicit false', () => {
    const payload = bridge.toProviderInput({ request_prompt: 'a fox' }, 'provider_a');

    expect(payload).toEqual({
      aspect_ratio: '1:1',
      detail: 'standard',
      disable_safety_checker: true,
      output_format: 'png',
      prompt: 'a fox',
    });
  });

  it('validates unsupported values and unknown fields strictly', () => {
    expect(() =>
      bridge.normalize({
        request_aspect_ratio: '3:4',
        request_detail_level: 'ultra',
        request_prompt: 'x',
        unknown: true,
      }),
    ).toThrow(ValidationError);
  });

  it('resolves provider order from fastest and explicit orders', () => {
    expect(bridge.providerOrder()).toEqual(['provider_a', 'provider_b']);
    expect(bridge.providerOrder({ request_provider_order: PROVIDER_ORDER_FASTEST })).toEqual(['provider_a', 'provider_b']);
    expect(bridge.providerOrder({ request_provider_order: 'provider_b,provider_a' })).toEqual(['provider_b', 'provider_a']);
    expect(bridge.providerOrder({ request_provider_order: ['provider_b', 'provider_a'] })).toEqual(['provider_b', 'provider_a']);
    expect(bridge.providerOrder({ request_provider_order: [PROVIDER_ORDER_FASTEST] })).toEqual(['provider_a', 'provider_b']);
    expect(() => bridge.providerOrder({ request_provider_order: 'provider_b,unknown' })).toThrow(ValidationError);
    expect(() => bridge.providerOrder({ request_provider_order: ['provider_b', 'unknown'] })).toThrow(ValidationError);
  });

  it('returns normalization-result.v1 envelopes', () => {
    const result = bridge.convert({ request_prompt: 'a lighthouse' }, 'provider_a');

    expect(result.schema_version).toBe('normalization-result.v1');
    expect(result.model_id).toBe('example/media-model');
    expect(result.provider_payload.prompt).toBe('a lighthouse');
    expect(result.provider_order).toEqual(['provider_a', 'provider_b']);
  });

  it('supports structured payload adapters as an explicit exception', () => {
    const structuredBridge = new RosettaBridge({
      ...demoDefinition,
      fields: {
        ...demoDefinition.fields,
        core: {
          ...demoDefinition.fields.core,
          request_provider_order: { default: PROVIDER_ORDER_FASTEST, type: 'enum', values: [PROVIDER_ORDER_FASTEST, 'provider_c'] },
        },
      },
      providers: {
        provider_c: {
          mapStructured: (input) => ({
            content: [
              { text: input.request_prompt, type: 'text' },
              { image_url: input.request_input_assets, type: 'image_url' },
            ],
          }),
        },
      },
      providerOrder: ['provider_c'],
      supportedProviders: ['provider_c'],
    });

    const payload = structuredBridge.toProviderInput(
      {
        request_input_assets: ['https://example.com/a.png'],
        request_prompt: 'nested payload',
      },
      'provider_c',
    );

    expect(payload).toEqual({
      content: [
        { text: 'nested payload', type: 'text' },
        { image_url: ['https://example.com/a.png'], type: 'image_url' },
      ],
    });
  });
});

describe('definition validation', () => {
  it('rejects provider-order enum values that mention unsupported providers', () => {
    expect(() =>
      new RosettaBridge({
        ...demoDefinition,
        fields: {
          ...demoDefinition.fields,
          core: {
            ...demoDefinition.fields.core,
            request_provider_order: { default: 'provider_a,unknown', type: 'enum', values: ['provider_a,unknown'] },
          },
        },
      }),
    ).toThrow(ValidationError);
  });

  it('rejects provider-native names in canonical field definitions', () => {
    expect(() =>
      new RosettaBridge({
        ...demoDefinition,
        fields: {
          ...demoDefinition.fields,
          options: {
            ...demoDefinition.fields.options,
            guidance_scale: { type: 'number' },
          },
        },
      }),
    ).toThrow(ValidationError);
  });

  it('rejects malformed public field names that the JSON Schema also rejects', () => {
    expect(() =>
      new RosettaBridge({
        ...demoDefinition,
        fields: {
          ...demoDefinition.fields,
          options: {
            ...demoDefinition.fields.options,
            'request-bad-name': { type: 'number' },
          },
        },
      }),
    ).toThrow(ValidationError);

    expect(() =>
      new RosettaBridge({
        ...demoDefinition,
        fields: {
          ...demoDefinition.fields,
          options: {
            ...demoDefinition.fields.options,
            request_BadName: { type: 'number' },
          },
        },
      }),
    ).toThrow(ValidationError);
  });

  it('rejects impossible numeric bounds and duplicate providers', () => {
    expect(() =>
      new RosettaBridge({
        ...demoDefinition,
        fields: {
          ...demoDefinition.fields,
          options: {
            ...demoDefinition.fields.options,
            request_bad_scale: { max: 1, min: 10, type: 'number' },
          },
        },
        supportedProviders: ['provider_a', 'provider_a'],
      }),
    ).toThrow(ValidationError);
  });

  it('rejects malformed JSON-manifest field specs before runtime validation', () => {
    expect(() =>
      new RosettaBridge({
        ...demoDefinition,
        fields: {
          ...demoDefinition.fields,
          options: {
            ...demoDefinition.fields.options,
            request_bad_enum: { type: 'enum', values: [1] } as unknown as BridgeDefinition['fields']['core'][string],
          },
        },
      }),
    ).toThrow(ValidationError);

    expect(() =>
      new RosettaBridge({
        ...demoDefinition,
        fields: {
          ...demoDefinition.fields,
          options: {
            ...demoDefinition.fields.options,
            request_bad_integer: { min: 0.5, type: 'integer' } as unknown as BridgeDefinition['fields']['core'][string],
          },
        },
      }),
    ).toThrow(ValidationError);

    expect(() =>
      new RosettaBridge({
        ...demoDefinition,
        fields: {
          ...demoDefinition.fields,
          options: {
            ...demoDefinition.fields.options,
            request_bad_type: { type: 'object' } as unknown as BridgeDefinition['fields']['core'][string],
          },
        },
      }),
    ).toThrow(ValidationError);

    expect(() =>
      new RosettaBridge({
        ...demoDefinition,
        fields: {
          ...demoDefinition.fields,
          options: {
            ...demoDefinition.fields.options,
            request_duplicate_enum: { type: 'enum', values: ['standard', 'standard'] },
          },
        },
      }),
    ).toThrow(ValidationError);
  });
});

describe('helpers', () => {
  it('intersects capabilities and sorts aspect ratios by width side', () => {
    expect(intersectValues(['png', 'jpg', 'webp'], ['jpeg', 'png', 'jpg'])).toEqual(['png', 'jpg']);
    expect(sortAspectRatios(['16:9', '1:1', '3:4', '9:16'])).toEqual(['1:1', '3:4', '9:16', '16:9']);
  });

  it('maps prompt enhancement and moderation semantics', () => {
    const input = { request_enhance_prompt: 'fast', request_moderation: false };

    expect(enhancePromptToBoolean(input)).toBe(true);
    expect(enhancePromptToMode(input)).toBe('fast');
    expect(enhancePromptToObject(input)).toEqual({ mode: 'fast' });
    expect(enhancePromptToOnOff(input)).toBe('On');
    expect(moderationToDisableBoolean(input)).toBe(true);
    expect(moderationToEnableBoolean(input)).toBe(false);
    expect(moderationToMode(input)).toBe('low');
    expect(moderationToTolerance(input, 1, 6)).toBe(6);
    expect(moderationToToleranceString(input, ['1', '6'])).toBe('6');
  });
});

describe('JSON Schema contracts', () => {
  it('use the same lowercase snake-case request field pattern as the runtime validator', () => {
    const bridgeDefinitionSchema = readJsonObject('../../../schemas/bridge-definition.v1.json');
    const normalizationResultSchema = readJsonObject('../../../schemas/normalization-result.v1.json');

    const bridgeFieldPattern = getString(
      getObject(getObject(getObject(bridgeDefinitionSchema, '$defs'), 'fieldShape'), 'propertyNames'),
      'pattern',
    );
    const resultFieldPattern = getString(
      getObject(getObject(getObject(normalizationResultSchema, 'properties'), 'canonical_input'), 'propertyNames'),
      'pattern',
    );

    for (const pattern of [bridgeFieldPattern, resultFieldPattern]) {
      const regexp = new RegExp(pattern);

      expect(regexp.test('request_moderation')).toBe(true);
      expect(regexp.test('request_output_format')).toBe(true);
      expect(regexp.test('request_BadName')).toBe(false);
      expect(regexp.test('request-bad-name')).toBe(false);
      expect(regexp.test('generation_moderation')).toBe(false);
    }
  });

  it('use the same http(s)-only URL contract as the runtime validator', () => {
    const bridgeDefinitionSchema = readJsonObject('../../../schemas/bridge-definition.v1.json');
    const normalizationResultSchema = readJsonObject('../../../schemas/normalization-result.v1.json');

    const fieldSpecVariants = getArray(getObject(getObject(bridgeDefinitionSchema, '$defs'), 'fieldSpec'), 'oneOf')
      .filter(isJsonObject);
    const urlSpec = findFieldSpecVariant(fieldSpecVariants, 'url');
    const urlArraySpec = findFieldSpecVariant(fieldSpecVariants, 'url-array');

    expect(getString(getObject(getObject(urlSpec, 'properties'), 'default'), 'pattern')).toBe('^https?://');
    expect(getString(getObject(getObject(getObject(urlArraySpec, 'properties'), 'default'), 'items'), 'pattern')).toBe('^https?://');

    const enumSpec = findFieldSpecVariant(fieldSpecVariants, 'enum');
    const numberEnumSpec = findFieldSpecVariant(fieldSpecVariants, 'number-enum');
    expect(getObject(getObject(enumSpec, 'properties'), 'values').uniqueItems).toBe(true);
    expect(getObject(getObject(numberEnumSpec, 'properties'), 'values').uniqueItems).toBe(true);

    const canonicalArrayValue = getArray(
      getObject(getObject(getObject(normalizationResultSchema, 'properties'), 'canonical_input'), 'additionalProperties'),
      'oneOf',
    ).filter(isJsonObject).find((variant) => variant.type === 'array');

    if (!canonicalArrayValue) throw new Error('normalization-result.v1 must describe URL arrays');
    expect(getString(getObject(canonicalArrayValue, 'items'), 'pattern')).toBe('^https?://');
  });
});

describe('fixture contracts', () => {
  const fixtureBridge = bridgeFromPortableFixture('bridge-definition.valid.json');

  it('accepts valid minimal fixture requests and applies declared defaults', () => {
    const request = readFixture('request.valid-minimal.json');
    expect(fixtureBridge.normalize(request)).toEqual({
      request_aspect_ratio: '1:1',
      request_input_assets: [],
      request_moderation: true,
      request_output_format: 'png',
      request_prompt: 'a glass penguin',
    });
  });

  it('accepts valid defaulting fixtures with URL assets', () => {
    const request = readFixture('request.valid-with-defaults.json');
    expect(fixtureBridge.normalize(request)).toMatchObject({
      request_input_assets: ['https://example.com/reference.png'],
      request_output_format: 'png',
    });
  });

  it('maps one public fixture request into two provider-native payloads', () => {
    const request = readFixture('request.valid-provider-mapping.json');

    expect(fixtureBridge.toProviderInput(request, 'provider_a')).toEqual(readFixture('provider-a-payload.expected.json'));
    expect(fixtureBridge.toProviderInput(request, 'provider_b')).toEqual(readFixture('provider-b-payload.expected.json'));
  });

  it('rejects invalid fixture requests before dispatch', () => {
    expectIssue('request.invalid-unknown-field.json', 'unknown_field');
    expectIssue('request.invalid-url.json', 'invalid_type');
    expectIssue('request.invalid-unsupported-enum.json', 'unsupported_value');
  });

  it('keeps union-capability examples as review fixtures, not automatic JSON enforcement', () => {
    const manifest = readFixture('bridge-definition.union-capability.invalid.json');
    expect(getString(getObject(manifest, 'metadata'), 'why_invalid')).toContain('fallback unsafe');
  });
});

function readJsonObject(relativePath: string): JsonObject {
  const absolutePath = resolve(currentDirectory, relativePath);
  const parsed: unknown = JSON.parse(readFileSync(absolutePath, 'utf8'));
  if (isJsonObject(parsed)) return parsed;
  throw new Error(`${relativePath} must contain a JSON object.`);
}

function readFixture(name: string): JsonObject {
  return readJsonObject(`../../../examples/fixtures/${name}`);
}

function bridgeFromPortableFixture(name: string): RosettaBridge {
  const manifest = readFixture(name);
  return new RosettaBridge({
    fields: {
      core: getObject(manifest, 'core_fields') as BridgeDefinition['fields']['core'],
      options: getObject(manifest, 'option_fields') as BridgeDefinition['fields']['core'],
    },
    metadata: getObject(manifest, 'metadata'),
    modelId: getString(manifest, 'model_id'),
    providerOrder: getStringArray(manifest, 'provider_order'),
    providers: {
      provider_a: {
        mapCore: (input) => ({
          prompt: input.request_prompt,
          aspect_ratio: input.request_aspect_ratio,
          format: input.request_output_format,
        }),
        mapOptions: (input) => ({
          safety_enabled: input.request_moderation,
        }),
      },
      provider_b: {
        mapCore: (input) => ({
          text: input.request_prompt,
          aspect: input.request_aspect_ratio,
          output_format: input.request_output_format === 'jpg' ? 'jpeg' : input.request_output_format,
        }),
        mapOptions: (input) => ({
          moderation: input.request_moderation ? 'enabled' : 'disabled',
        }),
      },
    },
    schemaVersion: 'bridge-definition.v1',
    supportedProviders: getStringArray(manifest, 'supported_providers'),
  });
}

function expectIssue(fixtureName: string, code: string): void {
  try {
    bridgeFromPortableFixture('bridge-definition.valid.json').normalize(readFixture(fixtureName));
    throw new Error(`${fixtureName} unexpectedly passed validation.`);
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).issues.map((issue) => issue.code)).toContain(code);
  }
}

function getObject(object: JsonObject, key: string): JsonObject {
  const value = object[key];
  if (isJsonObject(value)) return value;
  throw new Error(`${key} must be a JSON object.`);
}

function getString(object: JsonObject, key: string): string {
  const value = object[key];
  if (typeof value === 'string') return value;
  throw new Error(`${key} must be a string.`);
}

function getStringArray(object: JsonObject, key: string): string[] {
  const value = object[key];
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value;
  throw new Error(`${key} must be a string array.`);
}

function getArray(object: JsonObject, key: string): unknown[] {
  const value = object[key];
  if (Array.isArray(value)) return value;
  throw new Error(`${key} must be an array.`);
}

function findFieldSpecVariant(variants: readonly JsonObject[], type: string): JsonObject {
  const variant = variants.find((candidate) => {
    const properties = getObject(candidate, 'properties');
    const typeSchema = getObject(properties, 'type');
    return typeSchema.const === type;
  });
  if (variant) return variant;
  throw new Error(`fieldSpec variant ${type} was not found.`);
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
