// research/lib/report.ts
import fs from 'fs';
import path from 'path';

export const RESULTS_DIR = path.resolve(__dirname, '../results');

export const ensureResultsDir = (): void => {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
};

export const writeJson = (name: string, data: unknown): string => {
  ensureResultsDir();
  const file = path.join(RESULTS_DIR, `${name}.json`);
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  return file;
};

export const writeCsv = (
  name: string,
  rows: Array<Record<string, string | number | boolean | null>>
): string => {
  ensureResultsDir();
  const file = path.join(RESULTS_DIR, `${name}.csv`);
  if (rows.length === 0) {
    fs.writeFileSync(file, '');
    return file;
  }
  const columns = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.join(','), ...rows.map(r => columns.map(c => escape(r[c])).join(','))];
  fs.writeFileSync(file, `${lines.join('\n')}\n`);
  return file;
};

export const writeMarkdown = (name: string, content: string): string => {
  ensureResultsDir();
  const file = path.join(RESULTS_DIR, `${name}.md`);
  fs.writeFileSync(file, `${content.trimEnd()}\n`);
  return file;
};

export const markdownTable = (headers: string[], rows: Array<Array<string | number>>): string => {
  const line = (cells: Array<string | number>) => `| ${cells.map(String).join(' | ')} |`;
  return [line(headers), `|${headers.map(() => ' --- ').join('|')}|`, ...rows.map(line)].join('\n');
};

export const fmt = (value: number, decimals = 2): string =>
  Number.isFinite(value) ? value.toFixed(decimals) : 'n/a';

export const meanStd = (values: number[]): { mean: number; std: number } => {
  if (values.length === 0) return { mean: Number.NaN, std: Number.NaN };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.length > 1 ? values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (values.length - 1) : 0;
  return { mean, std: Math.sqrt(variance) };
};

/** Reads --key=value and --flag arguments. */
export const parseArgs = (argv: string[]): Record<string, string | true> => {
  const out: Record<string, string | true> = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split('=');
    out[key] = value ?? true;
  }
  return out;
};

export const numberList = (value: string | true | undefined, fallback: number[]): number[] =>
  typeof value === 'string'
    ? value
        .split(',')
        .map(Number)
        .filter(n => Number.isFinite(n))
    : fallback;

export const environmentStamp = () => ({
  generatedAt: new Date().toISOString(),
  node: process.version,
  platform: `${process.platform}-${process.arch}`,
});
