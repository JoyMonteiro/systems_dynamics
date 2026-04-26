import { writable, derived } from 'svelte/store';
import type { Model, ManifestEntry } from '../lib/xmile/types.js';

export const manifest = writable<ManifestEntry[]>([]);
export const currentModel = writable<Model | null>(null);
export const currentEntry = writable<ManifestEntry | null>(null);
export const descriptionMd = writable<string>('');
export const modelLoading = writable(false);
export const modelError = writable<string | null>(null);

export const variables = derived(currentModel, ($m) => $m?.variables ?? []);
