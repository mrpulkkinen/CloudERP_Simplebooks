import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const storePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../data/store.json'
);

let state = null;
let queue = Promise.resolve();

async function ensureStateLoaded() {
  if (state) {
    return state;
  }
  const buffer = await readFile(storePath, 'utf8');
  state = JSON.parse(buffer);
  return state;
}

async function persist(nextState) {
  const payload = JSON.stringify(nextState, null, 2);
  await writeFile(storePath, `${payload}\n`);
}

export async function readState() {
  await ensureStateLoaded();
  return structuredClone(state);
}

export function mutateState(mutator) {
  queue = queue.then(async () => {
    await ensureStateLoaded();
    const draft = structuredClone(state);
    const result = await mutator(draft);
    state = draft;
    await persist(state);
    return result;
  });
  return queue;
}

export async function resetState(nextState) {
  state = structuredClone(nextState);
  await persist(state);
}
