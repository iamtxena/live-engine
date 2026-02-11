#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';

interface CandleRow {
  timestamp: string;
  line: string;
}

const files = [
  'data/binance/btcusdt/1m/BTCUSDT-1m-2025-11-23-lona.csv',
  'data/binance/btcusdt/1m/BTCUSDT-1m-2025-11-24-lona.csv',
  'data/binance/btcusdt/1m/BTCUSDT-1m-2025-11-25-lona.csv',
  'data/binance/btcusdt/1m/BTCUSDT-1m-2025-11-26-lona.csv',
  'data/binance/btcusdt/1m/BTCUSDT-1m-2025-11-27-lona.csv',
  'data/binance/btcusdt/1m/BTCUSDT-1m-2025-11-28-lona.csv',
];

const outputPath = 'data/binance/btcusdt/1m/BTCUSDT-1m-2025-11-23-to-28-lona.csv';

console.log('📦 Merging weekly files...');

const allRows: CandleRow[] = [];
let header = '';

for (const file of files) {
  console.log(`  Reading: ${file}`);
  const content = readFileSync(file, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  if (!header && lines.length > 0) {
    header = lines[0];
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const timestamp = line.split(',')[0];
    allRows.push({ timestamp, line });
  }
}

console.log(`✓ Total rows: ${allRows.length}`);
console.log('🔄 Sorting by timestamp...');
allRows.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

const output = `${header}\n${allRows.map((row) => row.line).join('\n')}`;
writeFileSync(outputPath, output);

console.log(`\n✅ Merged file: ${outputPath}`);
console.log(`📊 Total candles: ${allRows.length}`);
console.log(`📅 Range: ${allRows[0]?.timestamp} to ${allRows[allRows.length - 1]?.timestamp}`);
