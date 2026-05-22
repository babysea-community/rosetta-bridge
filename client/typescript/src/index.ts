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

export type FieldValue = string | number | boolean | string[] | null;
export type NormalizedInput = Record<string, FieldValue>;
export type MapperInput = Readonly<Record<string, FieldValue | undefined>>;
export type ProviderPayload = Record<string, unknown>;

export interface ValidationIssue {
  field: string;
  code:
    | 'definition_error'
    | 'invalid_default'
    | 'invalid_type'
    | 'max_items'
    | 'max_length'
    | 'max_value'
    | 'min_items'
    | 'min_length'
    | 'min_value'
    | 'missing_required'
    | 'pattern_mismatch'
    | 'unknown_field'
    | 'unsupported_value';
  message: string;
}

interface FieldSpecBase {
  description?: string;
  label?: string;
  required?: boolean;
}

export interface StringFieldSpec extends FieldSpecBase {
  default?: string;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  type: 'string';
}

export interface UrlFieldSpec extends FieldSpecBase {
  default?: string;
  type: 'url';
}

export interface EnumFieldSpec extends FieldSpecBase {
  default?: string;
  type: 'enum';
  values: readonly string[];
}

export interface NumberEnumFieldSpec extends FieldSpecBase {
  default?: number;
  type: 'number-enum';
  values: readonly number[];
}

export interface NumberFieldSpec extends FieldSpecBase {
  default?: number;
  max?: number;
  min?: number;
  type: 'number';
}

export interface IntegerFieldSpec extends FieldSpecBase {
  default?: number;
  max?: number;
  min?: number;
  type: 'integer';
}

export interface BooleanFieldSpec extends FieldSpecBase {
  default?: boolean;
  type: 'boolean';
}

export interface UrlArrayFieldSpec extends FieldSpecBase {
  default?: readonly string[];
  maxItems?: number;
  minItems?: number;
  type: 'url-array';
}

export type FieldSpec =
  | BooleanFieldSpec
  | EnumFieldSpec
  | IntegerFieldSpec
  | NumberEnumFieldSpec
  | NumberFieldSpec
  | StringFieldSpec
  | UrlArrayFieldSpec
  | UrlFieldSpec;

export type FieldShape = Record<string, FieldSpec>;

export interface ProviderAdapter {
  /** Maps common, provider-agnostic request fields into provider-native fields. */
  mapCore?: (input: MapperInput) => ProviderPayload;
  /** Maps optional tuning fields into provider-native parameters. May read core context. */
  mapOptions?: (input: MapperInput) => ProviderPayload;
  /** Explicit escape hatch for providers that require nested payload assembly. */
  mapStructured?: (input: Readonly<NormalizedInput>) => ProviderPayload;
}

export interface BridgeDefinition {
  fields: {
    core: FieldShape;
    options?: FieldShape;
  };
  metadata?: Record<string, unknown>;
  modelId: string;
  providerOrder?: readonly string[];
  providers: Record<string, ProviderAdapter>;
  schemaVersion?: 'bridge-definition.v1';
  supportedProviders: readonly string[];
}

export interface NormalizeOptions {
  strict?: boolean;
}

export interface CanonicalInputOptions extends NormalizeOptions {
  includeNullOptionFields?: boolean;
}

export interface NormalizationResult {
  canonical_input: NormalizedInput;
  generated_at: string;
  model_id: string;
  provider: string;
  provider_order: string[];
  provider_payload: ProviderPayload;
  schema_version: 'normalization-result.v1';
}

export interface BridgeDescription {
  core_fields: FieldShape;
  metadata?: Record<string, unknown>;
  model_id: string;
  option_fields: FieldShape;
  provider_order: string[];
  schema_version: 'bridge-definition.v1';
  supported_providers: string[];
}

export interface SharedMediaFieldOptions {
  /** Public default for request_aspect_ratio. Values should be the provider intersection, not a union. */
  defaultAspectRatio?: string;
  /** Public default for request_output_format. Values should be the provider intersection, not a union. */
  defaultFormat?: string;
  /** Public default for request_provider_order. Use fastest when the host application resolves provider order before dispatch. */
  defaultProviderOrder?: string;
  /** Public default for request_resolution. Use the cheapest safe tier when resolution changes product cost. */
  defaultResolution?: string;
  /** Adds required core request_duration_seconds values. Adapters convert to each provider's native duration type. */
  durationValues?: readonly number[];
  /** Lowest safe input-asset count across every registered provider. */
  maxInputAssets?: number;
  /** Highest required input-asset count across every registered provider. */
  minInputAssets?: number;
  /** Maximum request_output_count. Defaults to BabySea's single-output invariant. */
  outputCount?: number;
  /** Allowed public provider-order values. Include fastest only if the host application resolves it before dispatch. */
  providerOrders?: readonly string[];
  /** When false, request_prompt becomes optional with an empty-string default for utility transforms. */
  requiresPrompt?: boolean;
  /** Intersection of aspect ratios supported by every registered provider. */
  supportedAspectRatios: readonly string[];
  /** Intersection of output formats supported by every registered provider. */
  supportedFormats: readonly string[];
  /** Adds core request_resolution values. Keep pricing-sensitive resolution in core, not options. */
  supportedResolutions?: readonly string[];
  /** Adds core request_audio with a false default so billing/routing layers can inspect the audio mode. */
  supportsAudio?: boolean;
}

const CANONICAL_FIELD_NAME_PATTERN = /^request_[a-z0-9]+(?:_[a-z0-9]+)*$/;
const FIELD_SPEC_TYPES = new Set<FieldSpec['type']>([
  'boolean',
  'enum',
  'integer',
  'number',
  'number-enum',
  'string',
  'url',
  'url-array',
]);

export const PROVIDER_ORDER_FASTEST = 'fastest';

export class ValidationError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(message: string, issues: readonly ValidationIssue[]) {
    super(message);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

export class RosettaBridge {
  private readonly defaultProviderOrder: readonly string[];
  private readonly definition: BridgeDefinition;
  private readonly optionFieldNames: readonly string[];
  private readonly supportedProviderSet: ReadonlySet<string>;

  constructor(definition: BridgeDefinition) {
    assertValidDefinition(definition);
    this.definition = definition;
    this.optionFieldNames = Object.keys(definition.fields.options ?? {});
    this.supportedProviderSet = new Set(definition.supportedProviders);
    this.defaultProviderOrder = resolveProviderOrderValue(
      definition.providerOrder?.join(',') ?? definition.supportedProviders.join(','),
      definition.supportedProviders,
    );
  }

  normalize(input: Record<string, unknown>, options: NormalizeOptions = {}): NormalizedInput {
    const strict = options.strict ?? true;
    const issues: ValidationIssue[] = [];
    const normalized: NormalizedInput = {};
    const fieldEntries = [
      ...Object.entries(this.definition.fields.core),
      ...Object.entries(this.definition.fields.options ?? {}),
    ];
    const allowedFields = new Set(fieldEntries.map(([name]) => name));

    for (const [name, spec] of fieldEntries) {
      const supplied = Object.prototype.hasOwnProperty.call(input, name) && input[name] !== undefined;
      const value = supplied ? input[name] : cloneFieldValue(spec.default);

      if (value === undefined) {
        if (spec.required) {
          issues.push({ code: 'missing_required', field: name, message: `${name} is required.` });
        }
        continue;
      }

      const fieldIssues = validateFieldValue(name, spec, value);
      if (fieldIssues.length > 0) {
        issues.push(...fieldIssues);
        continue;
      }
      normalized[name] = cloneFieldValue(value) as FieldValue;
    }

    if (strict) {
      for (const name of Object.keys(input)) {
        if (!allowedFields.has(name)) {
          issues.push({ code: 'unknown_field', field: name, message: `${name} is not declared in the bridge schema.` });
        }
      }
    }

    if (issues.length > 0) {
      throw new ValidationError('rosetta-bridge: canonical input failed validation.', issues);
    }

    return normalized;
  }

  toCanonicalInput(input: Record<string, unknown>, options: CanonicalInputOptions = {}): NormalizedInput {
    const includeNullOptionFields = options.includeNullOptionFields ?? true;
    const normalized = this.normalize(input, options);
    if (!includeNullOptionFields) return normalized;

    const complete: NormalizedInput = { ...normalized };
    for (const name of this.optionFieldNames) {
      if (!Object.prototype.hasOwnProperty.call(complete, name)) {
        complete[name] = null;
      }
    }
    return complete;
  }

  toProviderInput(input: Record<string, unknown>, provider: string): ProviderPayload {
    const normalized = this.normalize(input);
    return this.toProviderInputFromNormalized(normalized, provider);
  }

  convert(input: Record<string, unknown>, provider: string): NormalizationResult {
    const normalized = this.normalize(input);
    return {
      canonical_input: this.toCanonicalInput(normalized),
      generated_at: new Date().toISOString(),
      model_id: this.definition.modelId,
      provider,
      provider_order: this.providerOrder(normalized),
      provider_payload: this.toProviderInputFromNormalized(normalized, provider),
      schema_version: 'normalization-result.v1',
    };
  }

  providerOrder(input: Record<string, unknown> = {}): string[] {
    const requested = input.request_provider_order;
    if (requested === undefined || requested === null || isProviderOrderSentinel(requested)) {
      return [...this.defaultProviderOrder];
    }
    if (Array.isArray(requested) && requested.length === 1 && isProviderOrderSentinel(requested[0])) {
      return [...this.defaultProviderOrder];
    }
    if (typeof requested === 'string' || Array.isArray(requested)) {
      return resolveProviderOrderValue(requested, this.definition.supportedProviders);
    }
    return [...this.defaultProviderOrder];
  }

  supportedProviders(): string[] {
    return [...this.definition.supportedProviders];
  }

  describe(): BridgeDescription {
    const description: BridgeDescription = {
      core_fields: cloneShape(this.definition.fields.core),
      model_id: this.definition.modelId,
      option_fields: cloneShape(this.definition.fields.options ?? {}),
      provider_order: [...this.defaultProviderOrder],
      schema_version: 'bridge-definition.v1',
      supported_providers: [...this.definition.supportedProviders],
    };
    if (this.definition.metadata) {
      description.metadata = { ...this.definition.metadata };
    }
    return description;
  }

  private toProviderInputFromNormalized(normalized: NormalizedInput, provider: string): ProviderPayload {
    if (!this.supportedProviderSet.has(provider)) {
      throw new ValidationError('rosetta-bridge: provider is not supported by this bridge.', [
        {
          code: 'unsupported_value',
          field: 'provider',
          message: `${provider} is not one of ${this.definition.supportedProviders.join(', ')}.`,
        },
      ]);
    }

    const adapter = this.definition.providers[provider];
    if (!adapter) {
      throw new Error(`rosetta-bridge: missing adapter for provider ${provider}.`);
    }

    const fullInput = Object.freeze({ ...normalized });
    if (adapter.mapStructured) {
      return omitUndefined(adapter.mapStructured(fullInput));
    }

    return omitUndefined({
      ...(adapter.mapCore?.(fullInput) ?? {}),
      ...(adapter.mapOptions?.(fullInput) ?? {}),
    });
  }
}

export function createRosettaBridge(definition: BridgeDefinition): RosettaBridge {
  return new RosettaBridge(definition);
}

export function sharedMediaFields(config: SharedMediaFieldOptions): FieldShape {
  assertNonEmpty('supportedAspectRatios', config.supportedAspectRatios);
  assertNonEmpty('supportedFormats', config.supportedFormats);

  const requiresPrompt = config.requiresPrompt ?? true;
  const outputCount = config.outputCount ?? 1;
  const maxInputAssets = config.maxInputAssets ?? 0;
  const minInputAssets = config.minInputAssets ?? 0;
  const providerOrders = config.providerOrders ?? [PROVIDER_ORDER_FASTEST];
  const defaultProviderOrder = config.defaultProviderOrder ?? providerOrders[0] ?? PROVIDER_ORDER_FASTEST;

  const fields: FieldShape = {
    request_prompt: requiresPrompt ? { minLength: 1, required: true, type: 'string' } : { default: '', type: 'string' },
    request_aspect_ratio: { default: config.defaultAspectRatio ?? config.supportedAspectRatios[0]!, type: 'enum', values: config.supportedAspectRatios },
    request_output_format: { default: config.defaultFormat ?? config.supportedFormats[0]!, type: 'enum', values: config.supportedFormats },
    request_output_count: { default: 1, max: outputCount, min: 1, type: 'integer' },
  };

  if (maxInputAssets > 0) {
    fields.request_input_assets = minInputAssets > 0
      ? { maxItems: maxInputAssets, minItems: minInputAssets, required: true, type: 'url-array' }
      : { default: [], maxItems: maxInputAssets, type: 'url-array' };
  }

  if (config.durationValues?.length) {
    fields.request_duration_seconds = { required: true, type: 'number-enum', values: config.durationValues };
  }

  if (config.supportedResolutions?.length) {
    fields.request_resolution = {
      default: config.defaultResolution ?? config.supportedResolutions[0]!,
      type: 'enum',
      values: config.supportedResolutions,
    };
  }

  if (config.supportsAudio) {
    fields.request_audio = { default: false, type: 'boolean' };
  }

  fields.request_provider_order = {
    default: defaultProviderOrder,
    type: 'enum',
    values: providerOrders,
  };

  return fields;
}

export function intersectValues<T extends number | string>(...sets: readonly (readonly T[])[]): T[] {
  if (sets.length === 0) return [];
  const [first, ...rest] = sets;
  return [...first!].filter((value) => rest.every((set) => set.includes(value)));
}

export function sortAspectRatios(ratios: readonly string[]): string[] {
  return [...ratios].sort((a, b) => ratioLeadingNumber(a) - ratioLeadingNumber(b) || a.localeCompare(b));
}

export function enhancePromptToBoolean(input: MapperInput): boolean | undefined {
  const value = readEnhancePromptValue(input);
  if (value === undefined) return undefined;
  return value !== 'off';
}

export function enhancePromptToMode(input: MapperInput): string | undefined {
  const value = readEnhancePromptValue(input);
  return typeof value === 'string' && value !== 'off' ? value : undefined;
}

export function enhancePromptToObject(input: MapperInput): { mode: string } | undefined {
  const mode = enhancePromptToMode(input);
  return mode ? { mode } : undefined;
}

export function enhancePromptToOnOff(input: MapperInput): 'On' | 'Off' | undefined {
  const enabled = enhancePromptToBoolean(input);
  return enabled === undefined ? undefined : enabled ? 'On' : 'Off';
}

export function moderationToDisableBoolean(input: MapperInput): boolean | undefined {
  const value = readModerationValue(input);
  return value === undefined ? undefined : !value;
}

export function moderationToEnableBoolean(input: MapperInput): boolean | undefined {
  return readModerationValue(input);
}

export function moderationToTolerance(input: MapperInput, min: number, max: number): number | undefined {
  const value = readModerationValue(input);
  return value === undefined ? undefined : value ? min : max;
}

export function moderationToToleranceString(input: MapperInput, values: readonly string[]): string | undefined {
  assertNonEmpty('values', values);
  const value = readModerationValue(input);
  return value === undefined ? undefined : value ? values[0]! : values[values.length - 1]!;
}

export function moderationToMode(input: MapperInput, enabled = 'auto', disabled = 'low'): string | undefined {
  const value = readModerationValue(input);
  return value === undefined ? undefined : value ? enabled : disabled;
}

function assertValidDefinition(definition: BridgeDefinition): void {
  const issues: ValidationIssue[] = [];

  if (!definition.modelId.trim()) {
    issues.push({ code: 'definition_error', field: 'modelId', message: 'modelId must be non-empty.' });
  }
  if (definition.supportedProviders.length === 0) {
    issues.push({ code: 'definition_error', field: 'supportedProviders', message: 'supportedProviders must be non-empty.' });
  }
  if (new Set(definition.supportedProviders).size !== definition.supportedProviders.length) {
    issues.push({ code: 'definition_error', field: 'supportedProviders', message: 'supportedProviders must be unique.' });
  }
  if (definition.schemaVersion !== undefined && definition.schemaVersion !== 'bridge-definition.v1') {
    issues.push({ code: 'definition_error', field: 'schemaVersion', message: 'schemaVersion must be bridge-definition.v1.' });
  }

  for (const provider of definition.supportedProviders) {
    if (!provider.trim()) {
      issues.push({ code: 'definition_error', field: 'supportedProviders', message: 'supportedProviders cannot contain empty names.' });
    }
    const adapter = definition.providers[provider];
    if (!adapter) {
      issues.push({ code: 'definition_error', field: `providers.${provider}`, message: `${provider} has no adapter.` });
    } else if (!adapter.mapCore && !adapter.mapOptions && !adapter.mapStructured) {
      issues.push({ code: 'definition_error', field: `providers.${provider}`, message: `${provider} adapter has no mapper.` });
    }
  }

  const supported = new Set(definition.supportedProviders);
  for (const provider of definition.providerOrder ?? []) {
    if (!supported.has(provider)) {
      issues.push({ code: 'definition_error', field: 'providerOrder', message: `${provider} is not supported.` });
    }
  }
  if (definition.providerOrder && new Set(definition.providerOrder).size !== definition.providerOrder.length) {
    issues.push({ code: 'definition_error', field: 'providerOrder', message: 'providerOrder must be unique.' });
  }

  const coreNames = new Set(Object.keys(definition.fields.core));
  for (const name of Object.keys(definition.fields.options ?? {})) {
    if (coreNames.has(name)) {
      issues.push({ code: 'definition_error', field: name, message: `${name} cannot be both core and option field.` });
    }
  }

  for (const [name, spec] of [
    ...Object.entries(definition.fields.core),
    ...Object.entries(definition.fields.options ?? {}),
  ]) {
    if (!CANONICAL_FIELD_NAME_PATTERN.test(name)) {
      issues.push({ code: 'definition_error', field: name, message: `${name} must match ${CANONICAL_FIELD_NAME_PATTERN.source}.` });
    }
    const definitionIssues = validateFieldSpecDefinition(name, spec);
    issues.push(...definitionIssues);
    if (definitionIssues.length === 0 && name === 'request_provider_order' && spec.type === 'enum') {
      for (const providerOrder of spec.values) {
        issues.push(...validateProviderOrderValue(providerOrder, definition.supportedProviders));
      }
    }
    if (definitionIssues.length === 0 && spec.default !== undefined) {
      const defaultIssues = validateFieldValue(name, spec, spec.default);
      issues.push(...defaultIssues.map((issue) => ({ ...issue, code: 'invalid_default' as const })));
    }
  }

  if (issues.length > 0) {
    throw new ValidationError('rosetta-bridge: bridge definition is invalid.', issues);
  }
}

function validateFieldSpecDefinition(name: string, spec: FieldSpec): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const rawSpec = spec as unknown as Record<string, unknown>;
  const rawType = rawSpec.type;

  if (typeof rawType !== 'string' || !FIELD_SPEC_TYPES.has(rawType as FieldSpec['type'])) {
    return [{ code: 'definition_error', field: name, message: `${name} type must be one of ${[...FIELD_SPEC_TYPES].join(', ')}.` }];
  }

  if (rawSpec.label !== undefined && typeof rawSpec.label !== 'string') {
    issues.push({ code: 'definition_error', field: name, message: `${name} label must be a string.` });
  }
  if (rawSpec.description !== undefined && typeof rawSpec.description !== 'string') {
    issues.push({ code: 'definition_error', field: name, message: `${name} description must be a string.` });
  }
  if (rawSpec.required !== undefined && typeof rawSpec.required !== 'boolean') {
    issues.push({ code: 'definition_error', field: name, message: `${name} required must be a boolean.` });
  }

  if (spec.type === 'enum') {
    issues.push(...validateEnumValues(name, rawSpec.values, 'string'));
  }
  if (spec.type === 'number-enum') {
    issues.push(...validateEnumValues(name, rawSpec.values, 'number'));
  }
  if ((spec.type === 'number' || spec.type === 'integer') && spec.min !== undefined && spec.max !== undefined && spec.min > spec.max) {
    issues.push({ code: 'definition_error', field: name, message: `${name} min cannot be greater than max.` });
  }
  if (spec.type === 'number' || spec.type === 'integer') {
    for (const key of ['min', 'max'] as const) {
      const value = rawSpec[key];
      if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value))) {
        issues.push({ code: 'definition_error', field: name, message: `${name} ${key} must be a finite number.` });
      }
      if (spec.type === 'integer' && typeof value === 'number' && !Number.isInteger(value)) {
        issues.push({ code: 'definition_error', field: name, message: `${name} ${key} must be an integer.` });
      }
    }
  }
  if (spec.type === 'string') {
    for (const key of ['minLength', 'maxLength'] as const) {
      const value = rawSpec[key];
      if (value !== undefined && (typeof value !== 'number' || !Number.isInteger(value) || value < 0)) {
        issues.push({ code: 'definition_error', field: name, message: `${name} ${key} must be a non-negative integer.` });
      }
    }
    if (spec.minLength !== undefined && spec.maxLength !== undefined && spec.minLength > spec.maxLength) {
      issues.push({ code: 'definition_error', field: name, message: `${name} minLength cannot be greater than maxLength.` });
    }
    if (rawSpec.pattern !== undefined && typeof rawSpec.pattern !== 'string') {
      issues.push({ code: 'definition_error', field: name, message: `${name} pattern must be a string.` });
    } else if (spec.pattern !== undefined) {
      try {
        new RegExp(spec.pattern);
      } catch {
        issues.push({ code: 'definition_error', field: name, message: `${name} pattern must be a valid regular expression.` });
      }
    }
  }
  if (spec.type === 'url-array') {
    for (const key of ['minItems', 'maxItems'] as const) {
      const value = rawSpec[key];
      if (value !== undefined && (typeof value !== 'number' || !Number.isInteger(value) || value < 0)) {
        issues.push({ code: 'definition_error', field: name, message: `${name} ${key} must be a non-negative integer.` });
      }
    }
  }
  if (spec.type === 'url-array' && spec.minItems !== undefined && spec.maxItems !== undefined && spec.minItems > spec.maxItems) {
    issues.push({ code: 'definition_error', field: name, message: `${name} minItems cannot be greater than maxItems.` });
  }
  return issues;
}

function validateEnumValues(name: string, values: unknown, kind: 'number' | 'string'): ValidationIssue[] {
  if (!Array.isArray(values) || values.length === 0) {
    return [{ code: 'definition_error', field: name, message: `${name} enum values must be a non-empty array.` }];
  }

  const issues: ValidationIssue[] = [];
  const seen = new Set<string | number>();
  for (const value of values) {
    const valid = kind === 'string'
      ? typeof value === 'string'
      : typeof value === 'number' && Number.isFinite(value);
    if (!valid) {
      issues.push({ code: 'definition_error', field: name, message: `${name} enum values must contain only ${kind} values.` });
      break;
    }
    if (seen.has(value)) {
      issues.push({ code: 'definition_error', field: name, message: `${name} enum values must be unique.` });
      break;
    }
    seen.add(value);
  }
  return issues;
}

function validateProviderOrderValue(value: string, supportedProviders: readonly string[]): ValidationIssue[] {
  if (isProviderOrderSentinel(value)) return [];
  return validateProviderOrderList(parseProviderOrderCredits(value), supportedProviders, value);
}

function validateProviderOrderList(providers: readonly string[], supportedProviders: readonly string[], label: string): ValidationIssue[] {
  if (providers.length === 0) {
    return [{ code: 'definition_error', field: 'request_provider_order', message: 'provider order values must contain at least one provider.' }];
  }
  const supported = new Set(supportedProviders);
  const issues: ValidationIssue[] = [];
  for (const provider of providers) {
    if (!supported.has(provider)) {
      issues.push({ code: 'definition_error', field: 'request_provider_order', message: `${provider} is not a supported provider.` });
    }
  }
  if (new Set(providers).size !== providers.length) {
    issues.push({ code: 'definition_error', field: 'request_provider_order', message: `${label} contains duplicate providers.` });
  }
  return issues;
}

function validateFieldValue(name: string, spec: FieldSpec, value: unknown): ValidationIssue[] {
  switch (spec.type) {
    case 'boolean':
      return typeof value === 'boolean' ? [] : invalidType(name, 'boolean');
    case 'enum':
      if (typeof value !== 'string') return invalidType(name, 'string enum');
      return spec.values.includes(value) ? [] : unsupportedValue(name, value, spec.values);
    case 'integer':
      if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) return invalidType(name, 'integer');
      return validateNumberBounds(name, spec, value);
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) return invalidType(name, 'finite number');
      return validateNumberBounds(name, spec, value);
    case 'number-enum':
      if (typeof value !== 'number' || !Number.isFinite(value)) return invalidType(name, 'number enum');
      return spec.values.includes(value) ? [] : unsupportedValue(name, value, spec.values);
    case 'string':
      if (typeof value !== 'string') return invalidType(name, 'string');
      return validateStringSpec(name, spec, value);
    case 'url':
      if (typeof value !== 'string') return invalidType(name, 'URL string');
      return isHttpUrl(value) ? [] : [{ code: 'invalid_type', field: name, message: `${name} must be an http(s) URL.` }];
    case 'url-array':
      return validateUrlArray(name, spec, value);
  }
}

function validateNumberBounds(name: string, spec: IntegerFieldSpec | NumberFieldSpec, value: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (spec.min !== undefined && value < spec.min) {
    issues.push({ code: 'min_value', field: name, message: `${name} must be >= ${spec.min}.` });
  }
  if (spec.max !== undefined && value > spec.max) {
    issues.push({ code: 'max_value', field: name, message: `${name} must be <= ${spec.max}.` });
  }
  return issues;
}

function validateStringSpec(name: string, spec: StringFieldSpec, value: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (spec.minLength !== undefined && value.length < spec.minLength) {
    issues.push({ code: 'min_length', field: name, message: `${name} must be at least ${spec.minLength} characters.` });
  }
  if (spec.maxLength !== undefined && value.length > spec.maxLength) {
    issues.push({ code: 'max_length', field: name, message: `${name} must be at most ${spec.maxLength} characters.` });
  }
  if (spec.pattern && !new RegExp(spec.pattern).test(value)) {
    issues.push({ code: 'pattern_mismatch', field: name, message: `${name} must match ${spec.pattern}.` });
  }
  return issues;
}

function validateUrlArray(name: string, spec: UrlArrayFieldSpec, value: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!Array.isArray(value)) return invalidType(name, 'URL array');
  if (spec.minItems !== undefined && value.length < spec.minItems) {
    issues.push({ code: 'min_items', field: name, message: `${name} must contain at least ${spec.minItems} item(s).` });
  }
  if (spec.maxItems !== undefined && value.length > spec.maxItems) {
    issues.push({ code: 'max_items', field: name, message: `${name} must contain at most ${spec.maxItems} item(s).` });
  }
  for (const item of value) {
    if (typeof item !== 'string' || !isHttpUrl(item)) {
      issues.push({ code: 'invalid_type', field: name, message: `${name} must contain only http(s) URLs.` });
      break;
    }
  }
  return issues;
}

function invalidType(field: string, expected: string): ValidationIssue[] {
  return [{ code: 'invalid_type', field, message: `${field} must be a ${expected}.` }];
}

function unsupportedValue(field: string, value: string | number, supportedValues: readonly (string | number)[]): ValidationIssue[] {
  return [
    {
      code: 'unsupported_value',
      field,
      message: `${field}=${String(value)} is not one of ${supportedValues.map(String).join(', ')}.`,
    },
  ];
}

function omitUndefined(payload: ProviderPayload): ProviderPayload {
  const cleaned: ProviderPayload = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) cleaned[key] = value;
  }
  return cleaned;
}

function resolveProviderOrderValue(value: readonly string[] | string, supportedProviders: readonly string[]): string[] {
  if (typeof value === 'string' && isProviderOrderSentinel(value)) return [...supportedProviders];
  if (Array.isArray(value) && value.length === 1 && isProviderOrderSentinel(value[0])) return [...supportedProviders];

  const requested = typeof value === 'string' ? parseProviderOrderCredits(value) : [...value];
  const issues = typeof value === 'string' ? validateProviderOrderValue(value, supportedProviders) : validateProviderOrderList(requested, supportedProviders, requested.join(','));
  if (issues.length > 0) {
    throw new ValidationError('rosetta-bridge: provider order is invalid.', issues);
  }
  const ordered = [...requested];
  for (const provider of supportedProviders) {
    if (!ordered.includes(provider)) ordered.push(provider);
  }
  return ordered.length > 0 ? ordered : [...supportedProviders];
}

function parseProviderOrderCredits(value: string): string[] {
  return value
    .split(',')
    .map((provider) => provider.trim())
    .filter(Boolean);
}

function isProviderOrderSentinel(value: unknown): value is string {
  return value === PROVIDER_ORDER_FASTEST;
}

function readEnhancePromptValue(input: MapperInput): string | undefined {
  const value = input.request_enhance_prompt;
  return typeof value === 'string' ? value : undefined;
}

function readModerationValue(input: MapperInput): boolean | undefined {
  const value = input.request_moderation;
  return typeof value === 'boolean' ? value : undefined;
}

function cloneFieldValue(value: unknown): unknown {
  return Array.isArray(value) ? [...value] : value;
}

function cloneShape(shape: FieldShape): FieldShape {
  return Object.fromEntries(Object.entries(shape).map(([name, spec]) => [name, { ...spec }])) as FieldShape;
}

function assertNonEmpty(name: string, values: readonly unknown[]): void {
  if (values.length === 0) {
    throw new Error(`rosetta-bridge: ${name} must be non-empty.`);
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function ratioLeadingNumber(ratio: string): number {
  const first = ratio.split(':')[0];
  const parsed = Number(first);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}
