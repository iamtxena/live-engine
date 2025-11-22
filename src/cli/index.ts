#!/usr/bin/env node

/**
 * Live Engine CLI
 *
 * Usage:
 *   pnpm cli               - Show help
 *   pnpm cli start         - Start WebSocket feed
 *   pnpm cli download BTC  - Download historical data
 *   pnpm cli convert       - Convert Python code
 */

import { Command } from 'commander';

const program = new Command();

program
  .name('live-engine')
  .description('CLI for Live Engine trading platform')
  .version('0.1.0');

program
  .command('start')
  .description('Start WebSocket feed for real-time data')
  .option('-a, --assets <assets...>', 'Assets to track', ['btcusdt', 'ethusdt'])
  .action((options) => {
    console.log('Starting WebSocket feed for:', options.assets);
    console.log('⚠️  CLI mode is not implemented yet.');
    console.log('👉 Use the web dashboard at http://localhost:3000/dashboard');
  });

program
  .command('download <symbol>')
  .description('Download historical market data')
  .option('-i, --interval <interval>', 'Candle interval', '1m')
  .option('-l, --limit <limit>', 'Number of candles', '500')
  .action((symbol, options) => {
    console.log(`Downloading ${options.limit} ${options.interval} candles for ${symbol}...`);
    console.log('⚠️  CLI mode is not implemented yet.');
    console.log('👉 Use the API: POST /api/historical');
  });

program
  .command('convert')
  .description('Convert Python code to TypeScript using Grok AI')
  .option('-f, --file <path>', 'Python file path')
  .action((options) => {
    console.log('Converting Python code to TypeScript...');
    console.log('⚠️  CLI mode is not implemented yet.');
    console.log('👉 Use the API: POST /api/convert');
  });

program.parse();
