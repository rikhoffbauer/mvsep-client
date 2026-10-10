import { Models } from './workflow.js';
import { modelFromAlgorithm } from './algorithm-model.js';
const SEPARATOR = /[+,]/;
const normalize = (stem) => stem.trim().toLowerCase().replace(/[\s_]+/g, '-');
const aliases = new Map([
    ['hi-hat', 'hh'], ['hihat', 'hh'], ['hi-hats', 'hh'],
    ['vocal', 'vocals'], ['instrumental', 'instrumental'],
    ['instrumentals', 'instrumental'], ['instrum', 'instrumental'],
    ['instruments', 'instrumental'], ['accompaniment', 'instrumental'],
]);
function comparable(value) {
    const key = normalize(value);
    return aliases.get(key) ?? key;
}
function matchStem(outputs, stem) {
    // Prefer the exact output name; avoid treating "other" as instrumental.
    const exact = outputs.find(x => normalize(x) === normalize(stem));
    if (exact)
        return exact;
    const aliases = outputs.filter(x => comparable(x) === comparable(stem));
    return aliases.length === 1 ? aliases[0] : undefined;
}
function communityScore(model) {
    const rating = model.rating;
    if (!rating || !Number.isFinite(rating.average) || !Number.isFinite(rating.total) || rating.total < 1)
        return null;
    // Bayesian prior keeps one-five-star-vote models from automatically winning.
    return (rating.average * rating.total + 3.5 * 12) / (rating.total + 12);
}
function choices(model) {
    const choices = [];
    const used = new Set();
    const add = (options, stems) => {
        const key = JSON.stringify([options, stems]);
        if (used.has(key) || !stems.length)
            return;
        used.add(key);
        choices.push({ model, options, stems });
    };
    if (model.profiles?.length && model.fields?.length) {
        // A variant's server-side key must have a corresponding user-facing field,
        // so the selected option can be sent back to MVSep during execution.
        for (const profile of model.profiles) {
            const options = {};
            let valid = true;
            for (const [key, value] of Object.entries(profile.match)) {
                const field = model.fields.find(f => f.serverKey === key);
                if (!field) {
                    valid = false;
                    break;
                }
                options[field.name] = value;
            }
            if (valid)
                add(options, profile.stems);
        }
    }
    else
        add({}, model.stems);
    // A small static union may contain extra stems; use it only when MVSep has
    // published no observed option-specific output profiles.
    return choices;
}
/** Parse e.g. best[vocals+drums+kick] or cheapest[vocals,other]@20. */
export function parseModelSelector(selector) {
    const match = /^\s*(best|cheapest|fewest)\[([^\]]+)\](?:@(\d+))?\s*$/i.exec(selector);
    if (!match)
        throw new SyntaxError('Selector must look like best[vocals+drums] or cheapest[vocals+drums]@20');
    const stems = match[2].split(SEPARATOR).map(x => x.trim()).filter(Boolean);
    if (!stems.length || stems.some(s => !/^[a-zA-Z0-9][\w -]{0,79}$/.test(s)))
        throw new SyntaxError('Invalid stem name in selector');
    return {
        prefer: match[1].toLowerCase(),
        stems,
        ...(match[3] ? { modelId: Number(match[3]), maxJobs: 1 } : {}),
    };
}
function catalogue(items) {
    const ids = new Set();
    return items.map(item => 'render_id' in item ? modelFromAlgorithm(item) : item).filter(model => {
        if (ids.has(model.id) || model.active === false || model.widget && model.widget !== 'single_upload')
            return false;
        ids.add(model.id);
        return true;
    });
}
function mapping(steps, wanted) {
    const result = Object.create(null);
    for (const stem of wanted) {
        // Last producer wins only as a deterministic display default; the result
        // explicitly records its producing step so duplicate names aren't confused.
        for (let i = steps.length - 1; i >= 0; i--) {
            const match = matchStem(steps[i].stems, stem);
            if (match) {
                result[stem] = { step: i, stem: match };
                break;
            }
        }
        if (!Object.hasOwn(result, stem))
            return null;
    }
    return result;
}
function plan(steps, inputs, wanted) {
    const outputs = mapping(steps, wanted);
    if (!outputs)
        return null;
    // Do not recommend an unnecessary paid job just because it boosts an average
    // community score. For parallel plans each job must contribute a requested stem.
    if (steps.length > 1 && !inputs[1] && steps.some((_, i) => !Object.values(outputs).some(producer => producer.step === i)))
        return null;
    // In a chained plan the downstream model must produce a requested output.
    if (steps.length > 1 && inputs[1] && !Object.values(outputs).some(v => v.step === 1))
        return null;
    const knownPrices = steps.every(s => typeof s.model.priceCoefficient === 'number' && s.model.priceCoefficient > 0);
    const score = steps.map(s => communityScore(s.model));
    const weighted = score.every((s) => s !== null);
    return {
        steps: steps.map((s, i) => ({
            modelId: s.model.id, name: s.model.name, options: { ...s.options },
            ...(inputs[i] ? { input: inputs[i] } : {}),
            stems: [...s.stems],
        })),
        outputs,
        priceCoefficient: knownPrices ? steps.reduce((sum, s) => sum + s.model.priceCoefficient, 0) : null,
        communityRating: weighted ? score.reduce((sum, s) => sum + s, 0) / score.length : null,
        reasons: [
            wanted.map(stem => stem + ' ← ' + steps[outputs[stem].step].model.name +
                ' (' + outputs[stem].stem + ')').join('; '),
            ...(weighted ? ['Community ratings (Bayesian-adjusted); not a measured audio-quality benchmark'] :
                ['Some models have no community rating; objective quality is unknown']),
            ...(knownPrices ? ['Combined model coefficient, not an exact credit cost'] :
                ['Price metadata incomplete; exact credit cost unknown']),
        ],
    };
}
function ranking(a, b, prefer) {
    const rating = (p) => p.communityRating ?? -1;
    const cost = (p) => p.priceCoefficient ?? Infinity;
    if (prefer === 'cheapest')
        return cost(a) - cost(b) || a.steps.length - b.steps.length ||
            rating(b) - rating(a);
    if (prefer === 'fewest')
        return a.steps.length - b.steps.length || rating(b) - rating(a) ||
            cost(a) - cost(b);
    // More jobs increase latency and credit use; community ratings are weak evidence.
    const quality = (p) => rating(p) - 0.12 * (p.steps.length - 1);
    return quality(b) - quality(a) || a.steps.length - b.steps.length || cost(a) - cost(b);
}
/**
 * Rank compatible 1–2 model workflows for exact requested stems.
 * No MVSep requests or paid jobs. Only known published output profiles qualify.
 */
export function rankModels(selector, models = Object.values(Models), limit = 8) {
    const request = typeof selector === 'string' ? parseModelSelector(selector) : selector;
    const want = [...new Set(request.stems.map(s => s.trim()).filter(Boolean))];
    if (!want.length || want.length > 32 || want.some(s => !/^[a-zA-Z0-9][\w -]{0,79}$/.test(s)))
        throw new TypeError('Specify 1–32 valid output stem names');
    if (request.maxJobs !== undefined && ![1, 2].includes(request.maxJobs))
        throw new RangeError('maxJobs must be 1 or 2');
    if (request.maxPriceCoefficient !== undefined &&
        (!Number.isFinite(request.maxPriceCoefficient) || request.maxPriceCoefficient <= 0))
        throw new TypeError('maxPriceCoefficient must be positive');
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
        throw new RangeError('limit must be 1–100');
    const prefer = request.prefer ?? 'best';
    if (!['best', 'cheapest', 'fewest'].includes(prefer))
        throw new TypeError('Invalid selection preference');
    const allow = request.allowedModelIds && new Set(request.allowedModelIds);
    const omit = new Set(request.excludedModelIds);
    const available = catalogue(models).filter(m => (!allow || allow.has(m.id)) && !omit.has(m.id) &&
        (request.modelId === undefined || m.id === request.modelId));
    const variants = available.flatMap(choices);
    const results = [];
    const signatures = new Set();
    const put = (candidate) => {
        if (!candidate || (request.maxPriceCoefficient !== undefined &&
            (candidate.priceCoefficient === null || candidate.priceCoefficient > request.maxPriceCoefficient)))
            return;
        const signature = JSON.stringify(candidate.steps.map(s => [s.modelId, s.options, s.input])) +
            JSON.stringify(candidate.outputs);
        if (!signatures.has(signature)) {
            signatures.add(signature);
            results.push(candidate);
        }
    };
    for (const first of variants) {
        put(plan([first], [undefined], want));
        if (request.modelId !== undefined || request.maxJobs === 1)
            continue;
        for (const second of variants) {
            if (first.model.id === second.model.id)
                continue;
            // Two models run independently against the same audio source.
            put(plan([first, second], [undefined, undefined], want));
            // A downstream percussion model can consume an upstream drums stem.
            // This is optional; both still need explicit paid-job approval at execution.
            const upstream = matchStem(first.stems, 'drums');
            if (upstream && (second.model.group === 'Drums, Bass and Synth' ||
                second.model.id === 37))
                put(plan([first, second], [undefined, { step: 0, stem: upstream }], want));
        }
    }
    return results.sort((a, b) => ranking(a, b, prefer) ||
        a.steps.map(s => s.modelId).join(',').localeCompare(b.steps.map(s => s.modelId).join(','))).slice(0, limit);
}
/** Return the highest-ranked plan or explain why no published model can meet it. */
export function selectModels(selector, models) {
    const matches = rankModels(selector, models);
    if (!matches.length)
        throw new Error('No available MVSep model plan covers every requested stem with published output metadata');
    return matches[0];
}
//# sourceMappingURL=model-selector.js.map