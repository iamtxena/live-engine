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

import 'dotenv/config';
import { Command } from 'commander';
import { fetchHistoricalCandles, type Asset } from '../lib/binance';
import { supabaseAdmin } from '../lib/supabase';

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
  .action(async (symbol, options) => {
    try {
      console.log(`📥 Downloading ${options.limit} ${options.interval} candles for ${symbol.toUpperCase()}...`);

      // Fetch from Binance
      const candles = await fetchHistoricalCandles(
        symbol.toLowerCase() as Asset,
        options.interval,
        parseInt(options.limit)
      );

      console.log(`✓ Fetched ${candles.length} candles from Binance`);

      // Store in Supabase
      const insertData = candles.map((candle: any) => ({
        asset: symbol.toLowerCase(),
        timestamp: candle.timestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        source: 'binance',
      }));

      const { error } = await supabaseAdmin
        .from('market_data')
        .upsert(insertData, {
          onConflict: 'asset,timestamp',
        });

      if (error) {
        console.error('❌ Error storing data:', error.message);
        process.exit(1);
      }

      console.log(`✓ Stored ${candles.length} candles in Supabase`);
      console.log(`\n📊 Data range: ${candles[candles.length - 1].timestamp} to ${candles[0].timestamp}`);
      console.log(`💰 Latest price: $${candles[0].close}`);

    } catch (error) {
      console.error('❌ Download failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
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
