import { DOCUMENT_CODEC_LIMITS } from './document-codec-contracts.js';
import type {
  DocumentCodecFailure,
  DocumentCodecLimits,
} from './document-codec-contracts.js';
export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };
export type Path = readonly (string | number)[];
export class CodecError extends Error {
  constructor(
    readonly reason: DocumentCodecFailure['reason'],
    readonly code: string,
    readonly path: Path,
    message: string,
  ) {
    super(message);
  }
}
export function fail(code: string, path: Path, message: string): never {
  throw new CodecError('corrupt', code, path, message);
}
export function limit(path: Path, message: string): never {
  throw new CodecError('resource-limit', 'codec.limit', path, message);
}
export function codecLimits(
  input: Partial<DocumentCodecLimits>,
): DocumentCodecLimits {
  const result = { ...DOCUMENT_CODEC_LIMITS, ...input };
  for (const key of Object.keys(result) as (keyof DocumentCodecLimits)[]) {
    if (
      !Object.hasOwn(DOCUMENT_CODEC_LIMITS, key) ||
      !Number.isSafeInteger(result[key]) ||
      result[key] < 1 ||
      result[key] > DOCUMENT_CODEC_LIMITS[key]
    )
      limit(
        [key],
        'Codec limits must be positive safe integers no larger than the documented hard caps.',
      );
  }
  return result;
}
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
function safeKey(key: string, path: Path) {
  if (forbidden.has(key))
    fail(
      'codec.unsafe-key',
      path,
      'Prototype-sensitive keys are forbidden, including in opaque payloads.',
    );
}
function safeNumber(value: number, path: Path) {
  if (
    !Number.isFinite(value) ||
    Object.is(value, -0) ||
    (Number.isInteger(value) && !Number.isSafeInteger(value))
  )
    fail(
      'codec.number',
      path,
      'Use finite JSON numbers, safe integers and positive zero; lossy numbers are not normalized.',
    );
}
function unicode(value: string, path: Path) {
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff))
        fail(
          'codec.unicode',
          path,
          'Unpaired UTF-16 surrogates are not representable UTF-8 text.',
        );
    } else if (c >= 0xdc00 && c <= 0xdfff)
      fail(
        'codec.unicode',
        path,
        'Unpaired UTF-16 surrogates are not representable UTF-8 text.',
      );
  }
}
/** Strict UTF-8 without Node, browser APIs, replacement characters or BOM stripping. */
export function decodeUtf8(bytes: Uint8Array): string {
  const chars: string[] = [];
  for (let i = 0; i < bytes.length; ) {
    const first = bytes[i++];
    let value: number;
    let count: number;
    let minimum: number;
    if (first < 0x80) {
      value = first;
      count = 0;
      minimum = 0;
    } else if (first >= 0xc2 && first <= 0xdf) {
      value = first & 31;
      count = 1;
      minimum = 0x80;
    } else if (first >= 0xe0 && first <= 0xef) {
      value = first & 15;
      count = 2;
      minimum = 0x800;
    } else if (first >= 0xf0 && first <= 0xf4) {
      value = first & 7;
      count = 3;
      minimum = 0x10000;
    } else fail('codec.utf8', [i - 1], 'Invalid UTF-8 leading byte.');
    for (let n = 0; n < count; n++) {
      const b = bytes[i++];
      if (b === undefined || b < 0x80 || b > 0xbf)
        fail('codec.utf8', [i - 1], 'Invalid or truncated UTF-8 continuation.');
      value = value * 64 + (b & 63);
    }
    if (
      value < minimum ||
      value > 0x10ffff ||
      (value >= 0xd800 && value <= 0xdfff)
    )
      fail(
        'codec.utf8',
        [i - 1],
        'Overlong, surrogate or out-of-range UTF-8 encoding.',
      );
    chars.push(String.fromCodePoint(value));
  }
  return chars.join('');
}
export function encodeUtf8(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const c of text) {
    const v = c.codePointAt(0) ?? 0;
    if (v < 0x80) bytes.push(v);
    else if (v < 0x800) bytes.push(0xc0 | (v >> 6), 0x80 | (v & 63));
    else if (v < 0x10000)
      bytes.push(0xe0 | (v >> 12), 0x80 | ((v >> 6) & 63), 0x80 | (v & 63));
    else
      bytes.push(
        0xf0 | (v >> 18),
        0x80 | ((v >> 12) & 63),
        0x80 | ((v >> 6) & 63),
        0x80 | (v & 63),
      );
  }
  return new Uint8Array(bytes);
}
/** Decimal normalization detects rounding/underflow without accepting large unsafe integer values. */
function decimal(text: string): string {
  const [mantissa, exponent = '0'] = text.toLowerCase().split('e');
  const negative = mantissa.startsWith('-');
  const [whole, fraction = ''] = (
    negative ? mantissa.slice(1) : mantissa
  ).split('.');
  let digits = (whole + fraction).replace(/^0+/, '');
  if (!digits) return negative ? '-0' : '0';
  let power = Number(exponent) - fraction.length;
  const trimmed = digits.replace(/0+$/, '');
  power += digits.length - trimmed.length;
  digits = trimmed;
  return `${negative ? '-' : ''}${digits}e${power}`;
}
export function parseJson(text: string, bounds: DocumentCodecLimits): Json {
  let at = 0;
  let nodes = 0;
  const ws = () => {
    while (at < text.length && /[\t\n\r ]/.test(text[at])) at++;
  };
  const node = (path: Path) => {
    if (++nodes > bounds.maxNodes)
      limit(path, 'JSON node/key count exceeds the configured limit.');
  };
  function string(path: Path): string {
    const start = at++;
    let escaped = false;
    while (at < text.length) {
      const c = text[at++];
      if (at - start > bounds.maxStringLength * 6 + 2)
        limit(path, 'Encoded string exceeds the configured string budget.');
      if (c === '"' && !escaped) {
        let value: unknown;
        try {
          value = JSON.parse(text.slice(start, at));
        } catch {
          fail(
            'codec.json',
            path,
            'Invalid JSON string escape or control character.',
          );
        }
        if (typeof value !== 'string')
          fail('codec.json', path, 'Expected a JSON string.');
        if (value.length > bounds.maxStringLength)
          limit(path, 'String exceeds the UTF-16 length limit.');
        unicode(value, path);
        return value;
      }
      if (c === '\\' && !escaped) escaped = true;
      else escaped = false;
    }
    return fail('codec.json', path, 'Unterminated JSON string.');
  }
  const number = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
  function value(path: Path, depth: number): Json {
    if (depth > bounds.maxDepth)
      limit(path, 'JSON nesting exceeds the configured limit.');
    node(path);
    ws();
    const c = text[at];
    if (c === '"') return string(path);
    if (c === '{') {
      at++;
      ws();
      const result: Record<string, Json> = Object.create(null);
      let count = 0;
      if (text[at] === '}') {
        at++;
        return result;
      }
      for (;;) {
        ws();
        if (text[at] !== '"')
          fail('codec.json', path, 'Expected an object key.');
        node(path);
        const key = string(path);
        const next = [...path, key];
        safeKey(key, next);
        if (Object.hasOwn(result, key))
          fail(
            'codec.duplicate-key',
            next,
            'Duplicate decoded JSON keys are not allowed.',
          );
        if (++count > bounds.maxCollection)
          limit(path, 'Object property count exceeds the configured limit.');
        ws();
        if (text[at++] !== ':')
          fail('codec.json', next, 'Expected a colon after the object key.');
        result[key] = value(next, depth + 1);
        ws();
        if (text[at] === '}') {
          at++;
          return result;
        }
        if (text[at++] !== ',')
          fail('codec.json', path, 'Expected comma or closing object brace.');
      }
    }
    if (c === '[') {
      at++;
      ws();
      const result: Json[] = [];
      if (text[at] === ']') {
        at++;
        return result;
      }
      for (;;) {
        if (result.length >= bounds.maxCollection)
          limit(path, 'Array length exceeds the configured limit.');
        result.push(value([...path, result.length], depth + 1));
        ws();
        if (text[at] === ']') {
          at++;
          return result;
        }
        if (text[at++] !== ',')
          fail('codec.json', path, 'Expected comma or closing array bracket.');
      }
    }
    for (const [token, result] of [
      ['true', true],
      ['false', false],
      ['null', null],
    ] as const)
      if (text.startsWith(token, at)) {
        at += token.length;
        return result;
      }
    number.lastIndex = at;
    const matched = number.exec(text);
    if (!matched) return fail('codec.json', path, 'Expected a JSON value.');
    at = number.lastIndex;
    const result = Number(matched[0]);
    safeNumber(result, path);
    if (decimal(matched[0]) !== decimal(JSON.stringify(result)))
      fail(
        'codec.number',
        path,
        'This decimal literal would lose numeric information when encoded again.',
      );
    return result;
  }
  const result = value([], 0);
  ws();
  if (at !== text.length)
    fail('codec.json', [], 'Unexpected trailing content.');
  return result;
}

/** Copy only own enumerable data descriptors; JSON.stringify never sees caller objects or accessors. */
export function jsonData(input: unknown, bounds: DocumentCodecLimits): Json {
  let nodes = 0;
  let bytes = 0;
  const active = new Set<object>();
  function budget(n: number, path: Path) {
    bytes += n;
    if (bytes > bounds.maxBytes)
      limit(path, 'Encoded JSON exceeds the configured byte limit.');
  }
  function string(value: string, path: Path) {
    if (value.length > bounds.maxStringLength)
      limit(path, 'String exceeds the configured UTF-16 length limit.');
    unicode(value, path);
    budget(encodeUtf8(JSON.stringify(value)).length, path);
  }
  function copy(value: unknown, path: Path, depth: number): Json {
    if (++nodes > bounds.maxNodes || depth > bounds.maxDepth)
      limit(path, 'JSON node/depth budget exceeded.');
    if (value === null || typeof value === 'boolean') {
      budget(String(value).length, path);
      return value;
    }
    if (typeof value === 'number') {
      safeNumber(value, path);
      budget(JSON.stringify(value).length, path);
      return value;
    }
    if (typeof value === 'string') {
      string(value, path);
      return value;
    }
    if (typeof value !== 'object')
      return fail(
        'codec.non-json',
        path,
        'Undefined, symbols, bigint and executable values are not JSON data.',
      );
    if (active.has(value))
      return fail(
        'codec.cycle',
        path,
        'Cyclic objects cannot be represented as JSON.',
      );
    const array = Array.isArray(value);
    if (
      Object.getPrototypeOf(value) !==
        (array ? Array.prototype : Object.prototype) &&
      !(Object.getPrototypeOf(value) === null && !array)
    )
      return fail(
        'codec.non-json',
        path,
        'Use plain JSON objects and arrays, not class instances or custom prototypes.',
      );
    if (array && value.length > bounds.maxCollection)
      limit(path, 'Array length exceeds the configured limit.');
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Object.getOwnPropertySymbols(value).length)
      fail('codec.non-json', path, 'Symbol keys cannot be preserved in JSON.');
    const keys = Object.keys(descriptors).filter(
      (k) => !array || k !== 'length',
    );
    if (keys.length > bounds.maxCollection)
      limit(path, 'Object property count exceeds the configured limit.');
    if (
      array &&
      (keys.length !== value.length || keys.some((k, i) => k !== String(i)))
    )
      fail(
        'codec.non-json',
        path,
        'Sparse arrays and extra array properties are not supported.',
      );
    const result: Json[] | Record<string, Json> = array
      ? []
      : Object.create(null);
    budget(2 + Math.max(0, keys.length - 1), path);
    active.add(value);
    for (const key of keys) {
      const next = [...path, array ? Number(key) : key];
      const descriptor = descriptors[key];
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value'))
        fail(
          'codec.non-json',
          next,
          'Accessors and non-enumerable data cannot be serialized safely.',
        );
      if (!array) {
        safeKey(key, next);
        if (++nodes > bounds.maxNodes)
          limit(next, 'JSON node/key budget exceeded.');
        string(key, next);
        budget(1, next);
      }
      const item = copy(descriptor.value, next, depth + 1);
      if (Array.isArray(result)) result.push(item);
      else result[key] = item;
    }
    active.delete(value);
    return result;
  }
  return copy(input, [], 0);
}
