function parseMetadata(value, name) {
    if (typeof value !== 'string')
        return value;
    try {
        return JSON.parse(value);
    }
    catch {
        throw new TypeError('Invalid MVSep metadata JSON: ' + name);
    }
}
/** Build a model descriptor from current API metadata, including output names and option variants. */
export function modelFromAlgorithm(algorithm, suppliedStems) {
    const raw = algorithm;
    const outputs = parseMetadata(raw.outputs, 'outputs');
    const variations = parseMetadata(raw.output_variants, 'output_variants');
    const declared = parseMetadata(raw.output_stems, 'output_stems');
    const profiles = [];
    if (variations && typeof variations === 'object' && 'variants' in variations &&
        Array.isArray(variations.variants)) {
        for (const variant of variations.variants) {
            if (!variant || typeof variant !== 'object' || !variant.outputs ||
                typeof variant.outputs !== 'object' || !variant.match ||
                typeof variant.match !== 'object')
                continue;
            profiles.push({
                match: Object.fromEntries(Object.entries(variant.match).map(([k, v]) => [k, String(v)])),
                stems: Object.keys(variant.outputs),
            });
        }
    }
    const named = outputs && typeof outputs === 'object' && !Array.isArray(outputs)
        ? Object.keys(outputs) : [];
    const stems = suppliedStems ??
        [...new Set([...named, ...profiles.flatMap(p => p.stems),
                ...(named.length === 0 && Array.isArray(declared) ? declared.filter(s => typeof s === 'string') : [])])];
    const fields = (algorithm.algorithm_fields ?? []).map(field => ({
        name: field.name ?? '',
        ...(field.text ? { text: field.text } : {}),
        ...(typeof field.server_key === 'string' ? { serverKey: field.server_key } : {}),
        ...(field.default_key !== undefined ? { defaultKey: String(field.default_key) } : {}),
        ...(field.options ? { choices: parseMetadata(field.options, 'field.options') } : {}),
    })).filter(field => field.name.length > 0);
    return {
        id: algorithm.render_id,
        name: algorithm.name,
        ...(Number.isFinite(algorithm.price_coefficient) && (algorithm.price_coefficient ?? 0) > 0 ? { priceCoefficient: algorithm.price_coefficient } : {}),
        ...(algorithm.rating && Number(algorithm.rating.total) > 0 && Number.isFinite(Number(algorithm.rating.average)) ? { rating: { average: Number(algorithm.rating.average), total: Number(algorithm.rating.total) } } : {}),
        ...(algorithm.algorithm_group?.name ? { group: algorithm.algorithm_group.name } : {}),
        ...(Number.isFinite(algorithm.algorithm_group_id) ? { groupId: algorithm.algorithm_group_id } : {}),
        stems: [...stems],
        ...(algorithm.audio_widget ? { widget: algorithm.audio_widget } : {}),
        ...(raw.is_active !== undefined ? { active: Boolean(raw.is_active) } : {}),
        ...(fields.length ? { fields } : {}),
        ...(profiles.length ? { profiles } : {}),
    };
}
//# sourceMappingURL=algorithm-model.js.map