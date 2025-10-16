import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resetState, readState } from '../src/lib/store.js';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(rootDir, '../../../data/seed.json');
const initialSeed = JSON.parse(await readFile(seedPath, 'utf8'));

export async function loadSeedState() {
  return structuredClone(initialSeed);
}

export async function resetDatabase() {
  await resetState(await loadSeedState());
}

export async function snapshotState() {
  return readState();
}
