#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

interface CandleRow {
  timestamp: string;
  line: string;
}

function mergeFiles(files: string[], outputPath: string) {
  console.log(`📦 Merging ${files.length} files -> ${outputPath}`);

  const allRows: CandleRow[] = [];
  let header = '';

  for (const file of files) {
    if (!existsSync(file)) {
      console.log(`  ⚠️ Skipping (not found): ${file}`);
      continue;
    }
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
  allRows.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const output = `${header}\n${allRows.map((row) => row.line).join('\n')}`;
  writeFileSync(outputPath, output);

  console.log(`✅ Created: ${outputPath}`);
  console.log(`📅 Range: ${allRows[0]?.timestamp} to ${allRows[allRows.length - 1]?.timestamp}\n`);
}

// 5-minute files (Nov 23-29)
const files5m = [
  'data/binance/btcusdt/5m/BTCUSDT-5m-2025-11-23-lona.csv',
  'data/binance/btcusdt/5m/BTCUSDT-5m-2025-11-24-lona.csv',
  'data/binance/btcusdt/5m/BTCUSDT-5m-2025-11-25-lona.csv',
  'data/binance/btcusdt/5m/BTCUSDT-5m-2025-11-26-lona.csv',
  'data/binance/btcusdt/5m/BTCUSDT-5m-2025-11-27-lona.csv',
  'data/binance/btcusdt/5m/BTCUSDT-5m-2025-11-28-lona.csv',
  'data/binance/btcusdt/5m/BTCUSDT-5m-2025-11-29-lona.csv',
];

// 1-hour files (Nov 23-29)
const files1h = [
  'data/binance/btcusdt/1h/BTCUSDT-1h-2025-11-23-lona.csv',
  'data/binance/btcusdt/1h/BTCUSDT-1h-2025-11-24-lona.csv',
  'data/binance/btcusdt/1h/BTCUSDT-1h-2025-11-25-lona.csv',
  'data/binance/btcusdt/1h/BTCUSDT-1h-2025-11-26-lona.csv',
  'data/binance/btcusdt/1h/BTCUSDT-1h-2025-11-27-lona.csv',
  'data/binance/btcusdt/1h/BTCUSDT-1h-2025-11-28-lona.csv',
  'data/binance/btcusdt/1h/BTCUSDT-1h-2025-11-29-lona.csv',
];

mergeFiles(files5m, 'data/binance/btcusdt/5m/BTCUSDT-5m-2025-11-23-to-29-lona.csv');
mergeFiles(files1h, 'data/binance/btcusdt/1h/BTCUSDT-1h-2025-11-23-to-29-lona.csv');
