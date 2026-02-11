#!/usr/bin/env node

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function convertUnixToISO(unix: number): string {
  const unixMs = unix > 9999999999999 ? Math.floor(unix / 1000) : unix;
  return new Date(unixMs).toISOString();
}

function convertCSV(inputPath: string, symbol: string, outputPath: string) {
  const input = readFileSync(inputPath, 'utf-8');
  const lines = input.split('\n').filter((line) => line.trim());
  const dataLines = lines.slice(1);

  const lonaHeader = 'Timestamp,Symbol,Open,High,Low,Close,Volume\n';
  const lonaRows = dataLines
    .map((line) => {
      const parts = line.split(',');
      const [open_time, open, high, low, close, volume] = parts;
      const timestamp = convertUnixToISO(Number.parseInt(open_time));
      const symbolName = `${symbol.toUpperCase()}-PERPETUAL`;
      return `${timestamp},${symbolName},${open},${high},${low},${close},${volume}`;
    })
    .join('\n');

  writeFileSync(outputPath, lonaHeader + lonaRows);
  return dataLines.length;
}

const dir = process.argv[2] || 'data/binance/btcusdt/5m';
const symbol = process.argv[3] || 'btcusdt';

console.log(`🔄 Converting all CSV files in ${dir}...`);

const files = readdirSync(dir)
  .filter((f) => f.endsWith('.csv') && !f.endsWith('-lona.csv'))
  .sort();

let count = 0;
let totalCandles = 0;

for (const file of files) {
  const inputPath = join(dir, file);
  const outputPath = join(dir, file.replace('.csv', '-lona.csv'));

  console.log(`[${count + 1}/${files.length}] ${file}`);
  const candles = convertCSV(inputPath, symbol, outputPath);
  totalCandles += candles;
  count++;
}

console.log(`\n✅ Converted ${count} files (${totalCandles.toLocaleString()} candles)`);
