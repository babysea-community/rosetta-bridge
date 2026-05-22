#!/usr/bin/env node
/**
 * Copyright 2026 BabySea, Inc.
 * Licensed under the Apache License, Version 2.0.
 *
 * rosetta-bridge CLI.
 *
 * JSON bridge manifests can validate requests and emit public JSON Schema.
 * Mapping requires a JavaScript module because provider adapters are executable
 * TypeScript/JavaScript functions, not portable JSON.
 */
import { createRequire } from 'node:module';
import { extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';

import {
  RosettaBridge,
  ValidationError,
  type BridgeDefinition,
  type BridgeDescription,
  type FieldShape,
  type FieldSpec,
} from './index';

interface LoadedBridge {
  bridge: RosettaBridge;
  executableAdapters: boolean;
}

type JsonRecord = Record<string, unknown>;

const requireFromCli = createRequire(import.meta.url);
const PORTABLE_MANIFEST_KEYS = new Set([
  'schema_version',
  'model_id',
  'supported_providers',
  'provider_order',
  'core_fields',
  'option_fields',
  'metadata',
]);
const FIELD_TYPES = new Set([
  'boolean',
  'enum',
  'integer',
  'number',
  'number-enum',
  'string',
  'url',
  'url-array',
]);

async function main(argv: readonly string[]): Promise<number> {
  const [command, ...args] = argv;

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return command ? 0 : 1;
  }

  try {
    if (command === 'validate') {
      const [bridgePath, requestPath] = args;
      const paths = readCommandPaths(command, bridgePath, requestPath);
      const { bridge } = await loadBridge(paths.bridgePath);
      const request = await readJsonObject(paths.requestPath);
      const canonicalInput = bridge.toCanonicalInput(request);
      printJson({
        ok: true,
        canonical_input: canonicalInput,
        provider_order: bridge.providerOrder(canonicalInput),
      });
      return 0;
    }

    if (command === 'map') {
      const [bridgePath, requestPath] = args;
      const paths = readCommandPaths(command, bridgePath, requestPath);
      const provider = readOption(args, '--provider');
      if (!provider) {
        throw new CliError('map requires --provider <provider_id>.');
      }
      const loaded = await loadBridge(paths.bridgePath);
      if (!loaded.executableAdapters) {
        throw new CliError(
          'map requires a JavaScript module bridge definition with executable adapters. JSON manifests can validate/schema only.',
        );
      }
      const request = await readJsonObject(paths.requestPath);
      printJson({ ok: true, ...loaded.bridge.convert(request, provider) });
      return 0;
    }

    if (command === 'schema') {
      const [bridgePath] = args;
      if (!bridgePath) throw new CliError('schema requires <bridge>.');
      const { bridge } = await loadBridge(bridgePath);
      printJson(toRequestJsonSchema(bridge.describe()));
      return 0;
    }

    throw new CliError(`unknown command: ${command}`);
  } catch (error) {
    printError(error);
    return 1;
  }
}

function readCommandPaths(
  command: string,
  bridgePath?: string,
  requestPath?: string,
): { bridgePath: string; requestPath: string } {
  if (!bridgePath || !requestPath) {
    throw new CliError(`${command} requires <bridge> <request>.`);
  }
  return { bridgePath, requestPath };
}

function readOption(args: readonly string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  return args[index + 1];
}

async function loadBridge(path: string): Promise<LoadedBridge> {
  const absolutePath = resolve(path);
  const extension = extname(absolutePath);

  if (extension === '.json') {
    const manifest = await readJsonObject(absolutePath);
    return {
      bridge: new RosettaBridge(definitionFromPortableManifest(manifest)),
      executableAdapters: false,
    };
  }

  const moduleExports = await loadModule(absolutePath, extension);
  const exported =
    moduleExports.default ??
    moduleExports.bridge ??
    moduleExports.bridgeDefinition ??
    moduleExports.definition;

  if (!exported || typeof exported !== 'object') {
    throw new CliError(
      'bridge module must export default, bridge, bridgeDefinition, or definition.',
    );
  }

  if (isRosettaBridge(exported)) {
    return { bridge: exported, executableAdapters: true };
  }

  return {
    bridge: new RosettaBridge(exported as BridgeDefinition),
    executableAdapters: true,
  };
}

async function loadModule(path: string, extension: string): Promise<JsonRecord> {
  if (extension === '.cjs') {
    return requireFromCli(path) as JsonRecord;
  }

  return (await import(pathToFileURL(path).href)) as JsonRecord;
}

function isRosettaBridge(value: unknown): value is RosettaBridge {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { normalize?: unknown }).normalize === 'function' &&
    typeof (value as { convert?: unknown }).convert === 'function' &&
    typeof (value as { describe?: unknown }).describe === 'function'
  );
}

async function readJsonObject(path: string): Promise<JsonRecord> {
  const raw = await readFile(path, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new CliError(`${path} must contain a JSON object.`);
  }
  return parsed as JsonRecord;
}

function definitionFromPortableManifest(manifest: JsonRecord): BridgeDefinition {
  validatePortableManifest(manifest);
  const supportedProviders = readStringArray(manifest.supported_providers, 'supported_providers');
  const metadata = readOptionalRecord(manifest.metadata, 'metadata');
  const definition: BridgeDefinition = {
    fields: {
      core: readFieldShape(manifest.core_fields, 'core_fields'),
      options: readFieldShape(manifest.option_fields ?? {}, 'option_fields'),
    },
    modelId: readString(manifest.model_id, 'model_id'),
    providerOrder: readStringArray(manifest.provider_order ?? supportedProviders, 'provider_order'),
    providers: Object.fromEntries(
      supportedProviders.map((provider) => [provider, { mapStructured: () => ({}) }]),
    ),
    schemaVersion: 'bridge-definition.v1',
    supportedProviders,
  };
  if (metadata) definition.metadata = metadata;
  return definition;
}

function validatePortableManifest(manifest: JsonRecord): void {
  for (const key of Object.keys(manifest)) {
    if (!PORTABLE_MANIFEST_KEYS.has(key)) {
      throw new CliError(`unsupported portable manifest property: ${key}`);
    }
  }
  if (manifest.schema_version !== 'bridge-definition.v1') {
    throw new CliError('schema_version must be bridge-definition.v1.');
  }
}

function readFieldShape(value: unknown, field: string): FieldShape {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CliError(`${field} must be an object.`);
  }
  for (const [name, spec] of Object.entries(value)) {
    if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
      throw new CliError(`${field}.${name} must be an object.`);
    }
    const type = (spec as { type?: unknown }).type;
    if (typeof type !== 'string' || !FIELD_TYPES.has(type)) {
      throw new CliError(`${field}.${name}.type is unsupported.`);
    }
    if ((type === 'enum' || type === 'number-enum') && !Array.isArray((spec as { values?: unknown }).values)) {
      throw new CliError(`${field}.${name}.values must be an array for ${type}.`);
    }
  }
  return value as FieldShape;
}

function readOptionalRecord(value: unknown, field: string): JsonRecord | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CliError(`${field} must be an object when present.`);
  }
  return value as JsonRecord;
}

function readString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new CliError(`${field} must be a non-empty string.`);
  }
  return value;
}

function readStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || !value.every((item) => typeof item === 'string')) {
    throw new CliError(`${field} must be a non-empty string array.`);
  }
  return [...value];
}

function toRequestJsonSchema(description: BridgeDescription): JsonRecord {
  const fields = { ...description.core_fields, ...description.option_fields };
  const required = Object.entries(fields)
    .filter(([, spec]) => spec.required)
    .map(([name]) => name);

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: `${description.model_id} request`,
    type: 'object',
    additionalProperties: false,
    required,
    properties: Object.fromEntries(
      Object.entries(fields).map(([name, spec]) => [name, fieldSpecToJsonSchema(spec)]),
    ),
  };
}

function fieldSpecToJsonSchema(spec: FieldSpec): JsonRecord {
  const base: JsonRecord = {};
  if (spec.description) base.description = spec.description;
  if ('default' in spec && spec.default !== undefined) base.default = spec.default;

  switch (spec.type) {
    case 'boolean':
      return { ...base, type: 'boolean' };
    case 'enum':
      return { ...base, type: 'string', enum: [...spec.values] };
    case 'integer':
      return numberSchema(base, 'integer', spec.min, spec.max);
    case 'number':
      return numberSchema(base, 'number', spec.min, spec.max);
    case 'number-enum':
      return { ...base, type: 'number', enum: [...spec.values] };
    case 'string':
      return {
        ...base,
        type: 'string',
        ...(spec.minLength !== undefined ? { minLength: spec.minLength } : {}),
        ...(spec.maxLength !== undefined ? { maxLength: spec.maxLength } : {}),
        ...(spec.pattern !== undefined ? { pattern: spec.pattern } : {}),
      };
    case 'url':
      return { ...base, type: 'string', format: 'uri', pattern: '^https?://' };
    case 'url-array':
      return {
        ...base,
        type: 'array',
        items: { type: 'string', format: 'uri', pattern: '^https?://' },
        ...(spec.minItems !== undefined ? { minItems: spec.minItems } : {}),
        ...(spec.maxItems !== undefined ? { maxItems: spec.maxItems } : {}),
      };
  }
}

function numberSchema(base: JsonRecord, type: 'integer' | 'number', min?: number, max?: number): JsonRecord {
  return {
    ...base,
    type,
    ...(min !== undefined ? { minimum: min } : {}),
    ...(max !== undefined ? { maximum: max } : {}),
  };
}

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function printError(error: unknown): void {
  if (error instanceof ValidationError) {
    console.error(
      JSON.stringify(
        { ok: false, error: error.message, issues: error.issues },
        null,
        2,
      ),
    );
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ ok: false, error: message }, null, 2));
}

function printHelp(): void {
  console.log(`rosetta-bridge

Usage:
  rosetta-bridge validate <bridge.json|bridge.mjs> <request.json>
  rosetta-bridge map <bridge.mjs|bridge.cjs> <request.json> --provider <provider_id>
  rosetta-bridge schema <bridge.json|bridge.mjs>

Notes:
  JSON manifests are portable contracts and can validate/schema only.
  Mapping requires a JavaScript module because provider adapters are functions.`);
}

class CliError extends Error {
  constructor(message: string) {
    super(`rosetta-bridge: ${message}`);
    this.name = 'CliError';
  }
}

void main(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
});
