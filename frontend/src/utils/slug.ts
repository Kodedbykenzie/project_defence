import type { LearningModule } from '../types/platform';

export function slugify(text: string) {
  return text.
  normalize('NFKD').
  replace(/[\u0300-\u036f]/g, '').
  toLowerCase().
  replace(/&/g, ' and ').
  replace(/[^a-z0-9]+/g, '-').
  replace(/^-+|-+$/g, '').
  slice(0, 60) || 'course';
}

export const moduleSlug = (m: Pick<LearningModule, 'title'> & {slug?: string;}) => m.slug || slugify(m.title);

/** Accepts either a slug or a legacy module id. */
export function findModule<T extends LearningModule>(modules: T[], param?: string) {
  if (!param) return undefined;
  return modules.find((m) => moduleSlug(m) === param) ?? modules.find((m) => m.id === param);
}

export const moduleHref = (m: LearningModule) => `/app/modules/${moduleSlug(m)}`;
export const moduleEditHref = (m: LearningModule) => `/admin/modules/${moduleSlug(m)}/edit`;

/** Unique slug among other modules. */
export function uniqueSlug(title: string, modules: LearningModule[], selfId: string) {
  const base = slugify(title);
  const taken = new Set(modules.filter((m) => m.id !== selfId).map(moduleSlug));
  let slug = base;
  let n = 2;
  while (taken.has(slug)) slug = `${base}-${n++}`;
  return slug;
}