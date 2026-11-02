import type { Format, Requirements } from '../../types/files';
import { conflicts } from '../validation/requirements';

type NumericKey = Exclude<keyof Requirements, 'formats'>;
type Relation = 'max' | 'under' | 'min' | 'over' | 'exact';
export interface ParsedError {
  requirements: Requirements;
  ambiguities: string[];
  /** A conservative recognition score, not a probability of website acceptance. */
  confidence: number;
}

const numberPattern = '([+-]?\\d[\\d,]*(?:\\.\\d+)?)';
const numericValue = (value: string) =>
  /^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(value)
    ? Number(value.replaceAll(',', ''))
    : NaN;
const localPrefix = (text: string, index: number) =>
  text
    .slice(0, index)
    .split(/[;,\n]|[.!?](?=\s|$)/)
    .at(-1) ?? '';

function relation(prefix: string, suffix: string): Relation | undefined {
  if (
    /\bnot\s+(?:be\s+)?(?:exactly|exact|between|under|below|at least|at most)\b/.test(
      prefix.slice(-65),
    )
  )
    return undefined;
  if (
    /\b(?:around|about|approximately|roughly|ideally|recommended|should be)\b|~/.test(
      prefix.slice(-65),
    )
  )
    return undefined;
  const patterns: [Relation, RegExp][] = [
    [
      'max',
      /\b(?:at most|no more than|no larger than|not(?: be)? (?:greater|larger|more) than|up to|maximum|max|must not exceed|does not exceed|not exceed|cannot exceed|limit(?:ed)?(?: to| of| is)?)\b|<=|≤/g,
    ],
    ['under', /\b(?:under|below|less than|fewer than|smaller than)\b|<(?![=])/g],
    [
      'min',
      /\b(?:minimum|min|at least|no smaller than|no less than|not(?: be)? (?:smaller|less) than)\b|>=|≥/g,
    ],
    ['over', /\b(?:more than|greater than|over)\b|>(?![=])/g],
    ['exact', /\b(?:exactly|exact|required dimensions?|dimensions? of)\b|(?<![<>])=(?!=)/g],
  ];
  let found: Relation | undefined;
  let latest = -1;
  let earliestStart = Infinity;
  for (const [kind, pattern] of patterns) {
    for (const match of prefix.matchAll(pattern)) {
      // Compound phrases such as "no more than" take precedence over their inner words.
      const end = match.index + match[0].length;
      if (end > latest || (end === latest && match.index < earliestStart)) {
        found = kind;
        latest = end;
        earliestStart = match.index;
      }
    }
  }
  // A qualifier too far away is not evidence that this number has the same meaning.
  if (latest >= 0 && prefix.length - latest <= 50) return found;
  const trailing = suffix.match(
    /^\s*(?:in size\s*)?(maximum|max|or less|or smaller|minimum|min|or more|exactly|exact)\b/,
  );
  if (trailing) {
    if (/^(?:maximum|max|or less|or smaller)$/.test(trailing[1])) return 'max';
    if (/^(?:minimum|min|or more)$/.test(trailing[1])) return 'min';
    return 'exact';
  }
  return /\bmust be\b/.test(prefix.slice(-50)) ? 'exact' : undefined;
}

/** Recognizes explicit English limits only; the UI must let users review them. */
export function parseError(input: string): ParsedError {
  const requirements: Requirements = { formats: [] };
  const ambiguities: string[] = [];
  const text = input.slice(0, 20000).toLowerCase().replaceAll('−', '-');
  if (input.length > 20000) ambiguities.push('Only the first 20,000 characters were examined.');
  let recognized = 0;
  const add = (key: NumericKey, value: number) => {
    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      (key !== 'aspectRatio' && !Number.isSafeInteger(value))
    ) {
      ambiguities.push(
        `The ${key} value is invalid; enter a positive ${key === 'aspectRatio' ? 'number' : 'whole number'}.`,
      );
      return;
    }
    const previous = requirements[key];
    if (previous !== undefined && previous !== value) {
      if (key.startsWith('max')) requirements[key] = Math.min(previous, value);
      else if (key.startsWith('min')) requirements[key] = Math.max(previous, value);
      else ambiguities.push(`Different exact ${key} values were found. Choose the intended value.`);
    } else requirements[key] = value;
    recognized += 1;
  };

  const clauses = text.split(/[;\n]|[.!?](?=\s|$)|,(?=\s*(?:use|only|instead|accept))|\bbut\b/);
  const negativeFormats =
    /\b(?:not|never)\s+(?:supported|accepted|allowed|permitted)\b|\b(?:unsupported|disallowed|forbidden|prohibited)\b|\b(?:no|not|neither|except|excluding|without)\s+(?:the\s+)?(?:jpe?g|png|webp|pdf)\b|\b(?:(?:do|must|should) not|cannot|can't)\s+(?:be\s+)?(?:use|used|accept|accepted|upload|uploaded|submit|submitted)\b|\binstead of\b/;
  const formatList =
    /\b(?:jpe?g|png|webp|pdf)\b(?:\s*(?:,|\/|\||\bor\b|\band\b)\s*\b(?:jpe?g|png|webp|pdf)\b)*/g;
  let sourceMentioned = false;
  for (const clause of clauses) {
    const groups = [...clause.matchAll(formatList)];
    if (!groups.length) continue;
    if (negativeFormats.test(clause)) {
      ambiguities.push('A format is excluded or negated. Confirm the allowed formats.');
      continue;
    }
    const conversion =
      /\b(?:convert(?:ed|ing)?|change(?:d)?|re-?encode(?:d)?|save(?:d)?|export(?:ed)?|encode(?:d)?)\b/.test(
        clause,
      );
    for (const group of groups) {
      const before = clause.slice(0, group.index);
      const after = clause.slice(group.index + group[0].length);
      const destination =
        conversion &&
        /\b(?:to|as|into)\s+(?:(?:a|an|the)\s+)?(?:(?:file|image|document|format)\s*:?\s*)?$/.test(
          before,
        );
      const explicitBefore =
        /\b(?:only|use|upload|submit|require|requires|must be|needs? to be|(?:allowed|accepted|supported|permitted|required)(?:\s+(?:file|image|document))?(?:\s+(?:formats?|types?|extensions?))?\s*[:=]?|(?:formats?|types?|extensions?)\s*(?::|=|must be|are))\s*(?:(?:a|an|the)\s+)?$/.test(
          before,
        );
      const explicitAfter =
        /^\s*(?:(?:images?|files?|documents?|formats?|types?)\s*)?(?:only\b|(?:(?:are|is)\s+)?(?:accepted|allowed|supported|permitted|required)\b|must\s+not\s+exceed\b)/.test(
          after,
        );
      const source =
        !destination &&
        (conversion ||
          /\b(?:your|uploaded|received|selected|original|source|input|current)\b/.test(before));
      if (source) {
        sourceMentioned = true;
        continue;
      }
      if (!destination && !explicitBefore && !explicitAfter) {
        ambiguities.push(
          'A format was mentioned without a clear allowed format or conversion destination. Confirm the allowed formats.',
        );
        continue;
      }
      for (const token of group[0].matchAll(/\b(jpe?g|png|webp|pdf)\b/g)) {
        const format = (token[1] === 'jpg' ? 'jpeg' : token[1]) as Format;
        if (!requirements.formats.includes(format)) {
          requirements.formats.push(format);
          recognized += 1;
        }
      }
    }
  }
  if (sourceMentioned && !requirements.formats.length) {
    ambiguities.push(
      'A source format was mentioned, but the allowed output formats are unclear. Confirm the allowed formats.',
    );
  }

  const sizePattern = new RegExp(`${numberPattern}\\s*(bytes?|kib|mib|gib|kb|mb|gb|b)\\b`, 'g');
  const units: Record<string, number> = {
    b: 1,
    byte: 1,
    bytes: 1,
    kb: 1000,
    mb: 1000000,
    gb: 1000000000,
    kib: 1024,
    mib: 1048576,
    gib: 1073741824,
  };
  for (const match of text.matchAll(sizePattern)) {
    const kind = relation(
      localPrefix(text, match.index),
      text.slice(match.index + match[0].length),
    );
    const value = numericValue(match[1]) * units[match[2]];
    if (kind === 'max' || kind === 'under')
      add('maxBytes', kind === 'under' ? Math.ceil(value) - 1 : Math.floor(value));
    else if (kind === 'min' || kind === 'over')
      add('minBytes', kind === 'over' ? Math.floor(value) + 1 : Math.ceil(value));
    else
      ambiguities.push(
        'A file size was mentioned without a clear minimum or maximum. Enter the file size limits.',
      );
  }

  const pairPattern = new RegExp(
    `${numberPattern}\\s*(?:px|pixels)?\\s*[x×]\\s*${numberPattern}\\s*(?:px|pixels)?`,
    'g',
  );
  const pairSpans: [number, number][] = [];
  for (const match of text.matchAll(pairPattern)) {
    pairSpans.push([match.index, match.index + match[0].length]);
    const kind = relation(
      localPrefix(text, match.index),
      text.slice(match.index + match[0].length),
    );
    const width = numericValue(match[1]);
    const height = numericValue(match[2]);
    if (![width, height].every((value) => Number.isSafeInteger(value) && value > 0)) {
      ambiguities.push('Dimensions must be positive whole pixels.');
    } else if (kind) {
      const prefix =
        kind === 'min' || kind === 'over' ? 'min' : kind === 'max' || kind === 'under' ? 'max' : '';
      const offset = kind === 'over' ? 1 : kind === 'under' ? -1 : 0;
      add((prefix ? `${prefix}Width` : 'width') as NumericKey, width + offset);
      add((prefix ? `${prefix}Height` : 'height') as NumericKey, height + offset);
    } else
      ambiguities.push(
        'Dimensions were mentioned without minimum, maximum or exact wording. Choose how they apply.',
      );
  }

  const namedSpans: [number, number][] = [];
  const namedPattern = new RegExp(
    `\\b(width|height)\\s*(?:(?:must not be (?:less|smaller|greater|larger|more) than|must be|is|of|at least|at most|no more than|minimum|maximum|exactly)\\s*)?[:=]?\\s*${numberPattern}\\s*(?:px|pixels)?\\b`,
    'g',
  );
  for (const match of text.matchAll(namedPattern)) {
    namedSpans.push([match.index, match.index + match[0].length]);
    if (pairSpans.some(([start, end]) => match.index >= start && match.index < end)) continue;
    const valueIndex = match.index + match[0].indexOf(match[2]);
    const kind = relation(localPrefix(text, valueIndex), text.slice(match.index + match[0].length));
    const side = match[1] === 'width' ? 'Width' : 'Height';
    const prefix =
      kind === 'min' || kind === 'over' ? 'min' : kind === 'max' || kind === 'under' ? 'max' : '';
    if (kind)
      add(
        (prefix ? `${prefix}${side}` : side.toLowerCase()) as NumericKey,
        numericValue(match[2]) + (kind === 'over' ? 1 : kind === 'under' ? -1 : 0),
      );
    else
      ambiguities.push(
        `A ${match[1]} was mentioned without a clear minimum, maximum or exact value.`,
      );
  }

  const pagePattern = new RegExp(`${numberPattern}\\s*pages?\\b`, 'g');
  for (const match of text.matchAll(pagePattern)) {
    const kind = relation(
      localPrefix(text, match.index),
      text.slice(match.index + match[0].length),
    );
    if (kind === 'max' || kind === 'under')
      add('maxPages', numericValue(match[1]) - (kind === 'under' ? 1 : 0));
    else
      ambiguities.push(
        'A page count was mentioned without a clear maximum. Enter the maximum page count.',
      );
  }

  const ratioPattern = new RegExp(
    `\\b(?:aspect\\s+)?ratio\\s*(?:of|must be|is|=)?\\s*${numberPattern}\\s*:\\s*${numberPattern}`,
    'g',
  );
  for (const match of text.matchAll(ratioPattern)) {
    const numerator = numericValue(match[1]);
    const denominator = numericValue(match[2]);
    if (numerator > 0 && denominator > 0) add('aspectRatio', numerator / denominator);
    else ambiguities.push('Aspect ratio must contain two positive finite numbers.');
  }
  if (/\b(?:must be|required to be)\s+square\b/.test(text)) add('aspectRatio', 1);
  if (/\b(?:infinity|nan)\b/.test(text))
    ambiguities.push('A non-finite numeric value was found. Enter a finite limit.');
  const dimensionSpans = [...pairSpans, ...namedSpans];
  for (const match of text.matchAll(/\b\d+(?:\.\d+)?\s*(?:px|pixels?)\b/g)) {
    if (!dimensionSpans.some(([start, end]) => match.index >= start && match.index < end)) {
      ambiguities.push(
        'A pixel dimension was not understood. Enter and confirm its minimum, maximum or exact value.',
      );
    }
  }
  for (const match of text.matchAll(/\b(?:width|height)\b/g)) {
    if (!namedSpans.some(([start, end]) => match.index >= start && match.index < end)) {
      ambiguities.push(
        'A width or height instruction was not understood. Enter and confirm that limit manually.',
      );
    }
  }
  if (
    /\b(?:s?rgb|cmyk|gr[ae]yscale|monochrome|colou?r(?:\s+(?:space|profile|mode|depth))?)\b/.test(
      text,
    )
  ) {
    ambiguities.push(
      'Color space and color restrictions are not parsed or verified. Check them separately.',
    );
  }
  if (/(?:\b|\d)(?:dpi|ppi)\b|\b(?:dots|pixels)\s+per\s+inch\b/.test(text)) {
    ambiguities.push('Print density (DPI or PPI) is not parsed or verified. Check it separately.');
  }
  if (
    /\b(?:transparent|transparency|opaque|alpha channel|background|exif|icc profile|metadata)\b/.test(
      text,
    )
  ) {
    ambiguities.push(
      'Appearance or metadata conditions are not parsed or verified. Check them separately.',
    );
  }
  ambiguities.push(...conflicts(requirements));
  if (!recognized && !ambiguities.length)
    ambiguities.push(
      'No supported English restrictions were recognized. Enter the limits manually.',
    );
  const unique = [...new Set(ambiguities)];
  return {
    requirements,
    ambiguities: unique,
    confidence: recognized ? Math.max(0.2, 0.98 - unique.length * 0.2) : 0,
  };
}
