/** Test helper: `reference/example-data.yaml`, the fictional filled-in request, as text and as data. */
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import type { FillData } from './render';

export const exampleYaml = readFileSync('reference/example-data.yaml', 'utf8');

/** A fresh parse on every call, so tests can't leak changes into each other. */
export const exampleData = (): FillData => parse(exampleYaml) as FillData;
