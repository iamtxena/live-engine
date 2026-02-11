#!/usr/bin/env node

/**
 * Convert old Binance CSV format to Lona format
 *
 * Old format: open_time,open,high,low,close,volume,close_time,quote_volume,count,taker_buy_volume,taker_buy_quote_volume,ignore
 * Lona format: Timestamp,Symbol,Open,High,Low,Close,Volume
 *
 * Usage:
 *   pnpm tsx src/cli/convert-binance-csv.ts <input-csv> <symbol> [output-csv]
 *
 * Example:
 *   pnpm tsx src/cli/convert-binance-csv.ts data/binance/btcusdt/1m/BTCUSDT-1m-2025-10.csv btcusdt
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function convertUnixToISO(unix: number): string {
  // Binance Data Portal uses microseconds (16 digits), convert to milliseconds (13 digits)
  const unixMs = unix > 9999999999999 ? Math.floor(unix / 1000) : unix;
  return new Date(unixMs).toISOString();
}

function convertCSV(inputPath: string, symbol: string, outputPath?: string) {
  console.log(`📄 Reading: ${inputPath}`);

  const input = readFileSync(inputPath, 'utf-8');
  const lines = input.split('\n').filter((line) => line.trim());

  // Skip header line
  const dataLines = lines.slice(1);

  console.log(`✓ Found ${dataLines.length} candles`);

  // Convert to Lona format
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

  const output = lonaHeader + lonaRows;

  // Generate output path if not provided
  const finalOutputPath = outputPath || inputPath.replace('.csv', '-lona.csv');

  writeFileSync(finalOutputPath, output);
  console.log(`✓ Converted to Lona format: ${finalOutputPath}`);
  console.log(`📊 Total candles: ${dataLines.length}`);

  // Show sample
  const sampleLines = output.split('\n').slice(0, 4).join('\n');
  console.log(`\n📋 Sample output:\n${sampleLines}\n`);
}

// CLI
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: pnpm tsx src/cli/convert-binance-csv.ts <input-csv> <symbol> [output-csv]');
  console.error(
    'Example: pnpm tsx src/cli/convert-binance-csv.ts data/binance/btcusdt/1m/BTCUSDT-1m-2025-10.csv btcusdt',
  );
  process.exit(1);
}

const [inputPath, symbol, outputPath] = args;
convertCSV(inputPath, symbol, outputPath);
