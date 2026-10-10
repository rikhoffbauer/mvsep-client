import type { WorkflowModel, WorkflowOptionValues } from './workflow.js';

/** Resolve model-specific output hints, including known option-dependent variants. */
export function stemsForModel<S extends string>(
  definition: WorkflowModel<S>,
  options: WorkflowOptionValues = {},
): readonly S[] {
  if (!definition.profiles?.length || !definition.fields?.length) return definition.stems;
  const values: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const field of definition.fields) {
    if (!field.serverKey) continue;
    if (field.defaultKey !== undefined) values[field.serverKey] = String(field.defaultKey);
    for (const key of [field.name, field.text, field.serverKey]) {
      if (key && Object.hasOwn(options, key)) values[field.serverKey] = String(options[key]);
    }
  }
  const matches = definition.profiles.filter(profile =>
    Object.entries(profile.match).every(([key, value]) => values[key] === value));
  // If a profile is not represented in MVSep's snapshot, use the declared
  // superset rather than silently claiming an output does not exist.
  if (!matches.length) return definition.stems;
  return [...new Set(matches.flatMap(profile => [...profile.stems]))] as S[];
}
