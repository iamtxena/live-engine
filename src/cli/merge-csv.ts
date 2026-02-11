#!/usr/bin/env node

/**
 * Merge multiple Lona CSV files into one chronologically sorted file
 *
 * Usage:
 *   pnpm tsx src/cli/merge-csv.ts <output-file> <input-files...>
 *
 * Example:
 *   pnpm tsx src/cli/merge-csv.ts data/binance/btcusdt/1m/BTCUSDT-1m-2025-10-to-11-lona.csv data/binance/btcusdt/1m/*-lona.csv
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

interface CandleRow {
  timestamp: string;
  line: string;
}

function mergeCSVFiles(outputPath: string, pattern: string) {
  console.log(`📦 Merging CSV files matching: ${pattern}`);

  // Extract directory and pattern from input
  const dir = dirname(pattern);
  const patternMatch = pattern.split('/').pop() || '*-lona.csv';

  // Find all matching files
  const allFiles = readdirSync(dir);
  const files = allFiles
    .filter((f) => f.endsWith('-lona.csv'))
    .map((f) => join(dir, f))
    .sort();

  if (files.length === 0) {
    console.error('❌ No files found matching pattern');
    process.exit(1);
  }

  console.log(`✓ Found ${files.length} files to merge`);

  const allRows: CandleRow[] = [];
  let header = '';

  // Read all files
  for (const file of files) {
    console.log(`  Reading: ${file}`);
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim());

    // Get header from first file
    if (!header && lines.length > 0) {
      header = lines[0];
    }

    // Add all data rows (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const timestamp = line.split(',')[0];
      allRows.push({ timestamp, line });
    }
  }

  console.log(`✓ Total rows collected: ${allRows.length}`);

  // Sort by timestamp
  console.log('🔄 Sorting by timestamp...');
  allRows.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Write merged file
  const output = `${header}\n${allRows.map((row) => row.line).join('\n')}`;
  writeFileSync(outputPath, output);

  console.log(`\n✅ Merged file created: ${outputPath}`);
  console.log(`📊 Total candles: ${allRows.length}`);
  console.log(
    `📅 Date range: ${allRows[0]?.timestamp} to ${allRows[allRows.length - 1]?.timestamp}`,
  );

  // Show sample
  const sample = output.split('\n').slice(0, 4).join('\n');
  console.log(`\n📋 Sample output:\n${sample}\n`);
}

// CLI
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: pnpm tsx src/cli/merge-csv.ts <output-file> <pattern>');
  console.error(
    'Example: pnpm tsx src/cli/merge-csv.ts merged.csv "data/binance/btcusdt/1m/*-lona.csv"',
  );
  process.exit(1);
}

const [outputPath, pattern] = args;
try {
  mergeCSVFiles(outputPath, pattern);
} catch (err) {
  console.error('❌ Merge failed:', err instanceof Error ? err.message : err);
  process.exit(1);
}
