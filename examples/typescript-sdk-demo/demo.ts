/**
 * Copyright 2026 BabySea, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

// Repository-local import for type-checkable examples. Use `rosetta-bridge`
// after installing the SDK in an application.
import { RosettaBridge, moderationToDisableBoolean, sharedMediaFields } from '../../client/typescript/src/index';

const bridge = new RosettaBridge({
  fields: {
    core: sharedMediaFields({
      defaultAspectRatio: '1:1',
      defaultFormat: 'png',
      defaultProviderOrder: 'fastest',
      providerOrders: ['fastest', 'provider_a,provider_b', 'provider_b,provider_a'],
      supportedAspectRatios: ['1:1', '16:9'],
      supportedFormats: ['png', 'jpg'],
    }),
    options: {
      request_detail_level: { default: 'standard', type: 'enum', values: ['standard', 'high'] },
      request_moderation: { default: false, type: 'boolean' },
      request_seed: { type: 'integer' },
    },
  },
  modelId: 'example/media-model',
  providerOrder: ['provider_a', 'provider_b'],
  providers: {
    provider_a: {
      mapCore: (input) => ({
        aspect_ratio: input.request_aspect_ratio,
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
        output_format: input.request_output_format === 'jpg' ? 'jpeg' : input.request_output_format,
        prompt: input.request_prompt,
      }),
      mapOptions: (input) => ({
        render_hint: `${String(input.request_aspect_ratio)}:${String(input.request_detail_level)}`,
        seed: input.request_seed,
      }),
    },
  },
  schemaVersion: 'bridge-definition.v1',
  supportedProviders: ['provider_a', 'provider_b'],
});

const result = bridge.convert(
  {
    request_aspect_ratio: '16:9',
    request_output_format: 'jpg',
    request_prompt: 'a glass penguin on a bridge',
    request_seed: 123,
  },
  'provider_b',
);

console.log(JSON.stringify(result, null, 2));
