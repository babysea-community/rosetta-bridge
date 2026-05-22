// Copyright 2026 BabySea, Inc.
// Licensed under the Apache License, Version 2.0.
//
// Executable companion for bridge-definition.valid.json.
// Use this with `rosetta-bridge map` because provider adapters are functions.

/** @param {Record<string, unknown>} input */
function mapProviderACore(input) {
  return {
    prompt: input.request_prompt,
    aspect_ratio: input.request_aspect_ratio,
    format: input.request_output_format,
  };
}

/** @param {Record<string, unknown>} input */
function mapProviderAOptions(input) {
  return {
    safety_enabled: input.request_moderation,
  };
}

/** @param {Record<string, unknown>} input */
function mapProviderBCore(input) {
  return {
    text: input.request_prompt,
    aspect: input.request_aspect_ratio,
    output_format:
      input.request_output_format === 'jpg'
        ? 'jpeg'
        : input.request_output_format,
  };
}

/** @param {Record<string, unknown>} input */
function mapProviderBOptions(input) {
  return {
    moderation: input.request_moderation ? 'enabled' : 'disabled',
  };
}

export default {
  schemaVersion: 'bridge-definition.v1',
  modelId: 'example/media-model',
  supportedProviders: ['provider_a', 'provider_b'],
  providerOrder: ['provider_a', 'provider_b'],
  fields: {
    core: {
      request_prompt: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 2000,
      },
      request_aspect_ratio: {
        type: 'enum',
        values: ['1:1', '16:9'],
        default: '1:1',
      },
      request_output_format: {
        type: 'enum',
        values: ['png', 'jpg'],
        default: 'png',
      },
      request_input_assets: {
        type: 'url-array',
        maxItems: 1,
        default: [],
      },
    },
    options: {
      request_moderation: {
        type: 'boolean',
        default: true,
      },
    },
  },
  providers: {
    provider_a: {
      mapCore: mapProviderACore,
      mapOptions: mapProviderAOptions,
    },
    provider_b: {
      mapCore: mapProviderBCore,
      mapOptions: mapProviderBOptions,
    },
  },
  metadata: {
    adapter_note: 'Provider B maps request_output_format=jpg to jpeg.',
  },
};
