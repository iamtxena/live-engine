#!/usr/bin/env node

/**
 * Live Engine CLI
 *
 * Usage:
 *   pnpm cli                     - Show help
 *   pnpm cli start               - Start WebSocket feed
 *   pnpm cli download BTC        - Download historical data (via API)
 *   pnpm cli bulk-download       - Download from Binance Data Portal (faster)
 *   pnpm cli convert-csv         - Convert Binance CSV to Lona format
 *   pnpm cli merge               - Merge multiple CSV files
 *   pnpm cli convert             - Convert Python code to TypeScript
 */

import 'dotenv/config';
import { Command } from 'commander';
import { fetchHistoricalCandles, type Asset } from '../lib/binance';
import { supabaseAdmin } from '../lib/supabase';
import { convertPythonToTypescript, validateTypescriptCode, explainStrategy } from '../lib/ai-convert';
import { flushTraces } from '../lib/langsmith';
import { getProvider } from '../lib/ai-config';
import { writeFileSync, mkdirSync, readFileSync, readdirSync, existsSync, createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import https from 'https';

// Helper: Convert Binance timestamp to ISO
function convertUnixToISO(unix: number): string {
  const unixMs = unix > 9999999999999 ? Math.floor(unix / 1000) : unix;
  return new Date(unixMs).toISOString();
}

// Helper: Download file from URL
async function downloadFile(url: string, destPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const file = createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      } else {
        file.close();
        resolve(false);
      }
    }).on('error', () => {
      file.close();
      resolve(false);
    });
  });
}

// Helper: Parse Binance CSV and return candle objects
function parseBinanceCSV(filePath: string, symbol: string): Array<{
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}> {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const dataLines = lines.slice(1); // Skip header

  return dataLines.map(line => {
    const parts = line.split(',');
    const [open_time, open, high, low, close, volume] = parts;
    return {
      timestamp: convertUnixToISO(parseInt(open_time)),
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
      volume: parseFloat(volume),
    };
  });
}

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
  .command('download-range <symbol>')
  .description('Download historical data range (Oct 1 - Nov 23, 2025)')
  .option('-i, --interval <interval>', 'Candle interval', '1m')
  .option('-s, --start <date>', 'Start date (YYYY-MM-DD)', '2025-10-01')
  .option('-e, --end <date>', 'End date (YYYY-MM-DD)', '2025-11-23')
  .action(async (symbol, options) => {
    try {
      console.log(`📥 Downloading ${symbol.toUpperCase()} ${options.interval} candles from ${options.start} to ${options.end}...`);

      const startDate = new Date(options.start).getTime();
      const endDate = new Date(options.end).getTime();
      const intervalMs = options.interval === '1m' ? 60000 : options.interval === '5m' ? 300000 : 3600000;

      let allCandles: any[] = [];
      let currentEnd = endDate;
      let batch = 0;

      // Fetch in batches of 1000 (Binance limit), going backwards
      while (currentEnd > startDate) {
        batch++;
        console.log(`  Batch ${batch}: Fetching 1000 candles ending at ${new Date(currentEnd).toISOString()}...`);

        const candles = await fetchHistoricalCandles(
          symbol.toLowerCase() as Asset,
          options.interval,
          1000,
          currentEnd
        );

        if (candles.length === 0) break;

        allCandles.push(...candles);
        currentEnd = new Date(candles[candles.length - 1].timestamp).getTime() - intervalMs;

        // Respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Filter to exact date range
      allCandles = allCandles.filter(c => {
        const ts = new Date(c.timestamp).getTime();
        return ts >= startDate && ts <= endDate;
      });

      console.log(`✓ Fetched ${allCandles.length} total candles`);

      // Store in Supabase
      const batchSize = 500;
      for (let i = 0; i < allCandles.length; i += batchSize) {
        const batch = allCandles.slice(i, i + batchSize);
        const insertData = batch.map((candle: any) => ({
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
          .upsert(insertData, { onConflict: 'asset,timestamp' });

        if (error) {
          console.error(`❌ Error storing batch ${i / batchSize + 1}:`, error.message);
        } else {
          console.log(`  ✓ Stored batch ${i / batchSize + 1} (${batch.length} candles)`);
        }
      }

      // Export to CSV (Lona-compatible format)
      mkdirSync(join(process.cwd(), 'data', 'binance', symbol.toLowerCase(), options.interval), { recursive: true });
      const csvPath = join(process.cwd(), 'data', 'binance', symbol.toLowerCase(), options.interval, `${symbol.toUpperCase()}-${options.interval}-${options.start}-to-${options.end}.csv`);

      // Lona format: Timestamp, Symbol, Open, High, Low, Close, Volume
      const csvHeader = 'Timestamp,Symbol,Open,High,Low,Close,Volume\n';
      const csvRows = allCandles.map(c =>
        `${c.timestamp},${symbol.toUpperCase()}-PERPETUAL,${c.open},${c.high},${c.low},${c.close},${c.volume}`
      ).join('\n');

      writeFileSync(csvPath, csvHeader + csvRows);
      console.log(`\n✓ Exported to CSV: ${csvPath}`);
      console.log(`📊 Total candles: ${allCandles.length}`);
      console.log(`📅 Date range: ${allCandles[allCandles.length - 1]?.timestamp} to ${allCandles[0]?.timestamp}`);
      console.log(`💰 Latest price: $${allCandles[0]?.close}`);
    } catch (error) {
      console.error('❌ Download failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('export <symbol>')
  .description('Export Supabase data to CSV')
  .option('-i, --interval <interval>', 'Candle interval filter', '1m')
  .option('-s, --start <date>', 'Start date (YYYY-MM-DD)', '2025-10-01')
  .option('-e, --end <date>', 'End date (YYYY-MM-DD)', '2025-11-23')
  .action(async (symbol, options) => {
    try {
      console.log(`📤 Exporting ${symbol.toUpperCase()} data from Supabase...`);

      const { data: candles, error } = await supabaseAdmin
        .from('market_data')
        .select('*')
        .eq('asset', symbol.toLowerCase())
        .gte('timestamp', `${options.start}T00:00:00Z`)
        .lte('timestamp', `${options.end}T23:59:59Z`)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      if (!candles || candles.length === 0) {
        console.log('⚠️  No data found in Supabase for this range');
        return;
      }

      console.log(`✓ Found ${candles.length} candles in Supabase`);

      // Export to CSV (Lona-compatible format, different filename to avoid overwriting)
      mkdirSync(join(process.cwd(), 'data', 'binance', symbol.toLowerCase(), options.interval), { recursive: true });
      const csvPath = join(process.cwd(), 'data', 'binance', symbol.toLowerCase(), options.interval, `${symbol.toUpperCase()}-${options.interval}-${options.start}-to-${options.end}-exported.csv`);

      // Lona format: Timestamp, Symbol, Open, High, Low, Close, Volume
      const csvHeader = 'Timestamp,Symbol,Open,High,Low,Close,Volume\n';
      const csvRows = candles.map(c =>
        `${c.timestamp},${symbol.toUpperCase()}-PERPETUAL,${c.open},${c.high},${c.low},${c.close},${c.volume}`
      ).join('\n');

      writeFileSync(csvPath, csvHeader + csvRows);
      console.log(`\n✓ Exported to CSV: ${csvPath}`);
      console.log(`📊 Total candles: ${candles.length}`);
    } catch (error) {
      console.error('❌ Export failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('convert')
  .description('Convert Python code to TypeScript using AI')
  .option('-f, --file <path>', 'Python file path')
  .option('-c, --code <code>', 'Python code string')
  .option('-o, --output <path>', 'Output TypeScript file path')
  .option('--validate', 'Also validate the generated code')
  .option('--explain', 'Also explain the strategy')
  .action(async (options) => {
    try {
      const provider = getProvider();
      console.log(`🤖 Using AI provider: ${provider}`);

      let pythonCode: string;

      if (options.file) {
        if (!existsSync(options.file)) {
          console.error(`❌ File not found: ${options.file}`);
          process.exit(1);
        }
        pythonCode = readFileSync(options.file, 'utf-8');
        console.log(`📄 Reading: ${options.file}`);
      } else if (options.code) {
        pythonCode = options.code;
      } else {
        console.error('❌ Please provide --file or --code');
        console.log('Usage: pnpm cli convert --file strategy.py');
        console.log('       pnpm cli convert --code "def strategy(): ..."');
        process.exit(1);
      }

      console.log(`\n🔄 Converting Python to TypeScript...`);
      console.log(`   Code length: ${pythonCode.length} characters\n`);

      const result = await convertPythonToTypescript(pythonCode);

      console.log('✅ Conversion complete!\n');
      console.log('📦 Dependencies:', result.dependencies.join(', ') || 'none');
      console.log('📝 Intent:', result.original_intent);
      console.log('💡 Notes:', result.notes);

      // Output TypeScript code
      if (options.output) {
        writeFileSync(options.output, result.typescript_code);
        console.log(`\n💾 Saved to: ${options.output}`);
      } else {
        console.log('\n--- Generated TypeScript ---');
        console.log(result.typescript_code);
        console.log('--- End ---\n');
      }

      // Optional validation
      if (options.validate) {
        console.log('\n🔍 Validating generated code...');
        const validation = await validateTypescriptCode(result.typescript_code);
        console.log(`   Valid: ${validation.isValid ? '✅' : '❌'}`);
        if (validation.issues.length > 0) {
          console.log('   Issues:', validation.issues.join(', '));
        }
        if (validation.suggestions.length > 0) {
          console.log('   Suggestions:', validation.suggestions.join(', '));
        }
      }

      // Optional explanation
      if (options.explain) {
        console.log('\n📖 Strategy Explanation:');
        const explanation = await explainStrategy(pythonCode);
        console.log(explanation);
      }

      await flushTraces();

    } catch (error) {
      console.error('❌ Conversion failed:', error instanceof Error ? error.message : error);
      await flushTraces();
      process.exit(1);
    }
  });

// ============================================
// BULK DOWNLOAD FROM BINANCE DATA PORTAL
// ============================================
program
  .command('bulk-download <symbol>')
  .description('Download historical data from Binance Data Portal (faster than API)')
  .option('-i, --interval <interval>', 'Candle interval (1m, 5m, 1h)', '1m')
  .option('-s, --start <date>', 'Start date (YYYY-MM-DD)', '2025-11-23')
  .option('-e, --end <date>', 'End date (YYYY-MM-DD)', '2025-12-04')
  .option('--no-supabase', 'Skip storing in Supabase')
  .option('--no-csv', 'Skip exporting to CSV')
  .action(async (symbol, options) => {
    try {
      const symbolUpper = symbol.toUpperCase();
      const symbolLower = symbol.toLowerCase();
      const { interval, start, end } = options;
      const baseUrl = 'https://data.binance.vision/data/spot';
      const outputDir = join(process.cwd(), 'data', 'binance', symbolLower, interval);

      console.log(`📥 Downloading ${symbolUpper} ${interval} data from ${start} to ${end}...`);

      // Create output directory
      mkdirSync(outputDir, { recursive: true });

      const startDate = new Date(start);
      const endDate = new Date(end);
      const downloadedFiles: string[] = [];

      // Download monthly files
      console.log('\n📦 Downloading monthly archives...');
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const filename = `${symbolUpper}-${interval}-${year}-${month}.zip`;
        const url = `${baseUrl}/monthly/klines/${symbolUpper}/${interval}/${filename}`;
        const destPath = join(outputDir, filename);

        process.stdout.write(`  Downloading ${filename}...`);
        const success = await downloadFile(url, destPath);
        if (success) {
          console.log(' ✓');
          downloadedFiles.push(destPath);
        } else {
          console.log(' ⚠️ not available');
        }

        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      // Download daily files for end month
      console.log('\n📅 Downloading daily files...');
      const endYear = endDate.getFullYear();
      const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
      for (let day = 1; day <= endDate.getDate(); day++) {
        const dayStr = String(day).padStart(2, '0');
        const filename = `${symbolUpper}-${interval}-${endYear}-${endMonth}-${dayStr}.zip`;
        const url = `${baseUrl}/daily/klines/${symbolUpper}/${interval}/${filename}`;
        const destPath = join(outputDir, filename);

        process.stdout.write(`  Downloading ${filename}...`);
        const success = await downloadFile(url, destPath);
        if (success) {
          console.log(' ✓');
          downloadedFiles.push(destPath);
        } else {
          console.log(' ⚠️ not available');
        }
      }

      if (downloadedFiles.length === 0) {
        console.log('\n❌ No files downloaded');
        process.exit(1);
      }

      // Unzip all files
      console.log('\n📂 Extracting archives...');
      for (const zipPath of downloadedFiles) {
        try {
          execSync(`unzip -o -q "${zipPath}" -d "${outputDir}"`, { stdio: 'pipe' });
        } catch {
          // Ignore unzip errors for individual files
        }
      }

      // Find and process all CSV files
      const csvFiles = readdirSync(outputDir)
        .filter(f => f.endsWith('.csv') && !f.endsWith('-lona.csv'))
        .filter(f => {
          // Filter to date range
          const match = f.match(/(\d{4})-(\d{2})(?:-(\d{2}))?/);
          if (!match) return false;
          const fileYear = parseInt(match[1]);
          const fileMonth = parseInt(match[2]);
          const fileDay = match[3] ? parseInt(match[3]) : 1;
          const fileDate = new Date(fileYear, fileMonth - 1, fileDay);
          return fileDate >= startDate && fileDate <= endDate;
        })
        .sort();

      console.log(`\n✓ Found ${csvFiles.length} CSV files to process`);

      // Parse all candles
      let allCandles: Array<{
        timestamp: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      }> = [];

      for (const csvFile of csvFiles) {
        const candles = parseBinanceCSV(join(outputDir, csvFile), symbolLower);
        allCandles.push(...candles);
        console.log(`  Parsed ${csvFile}: ${candles.length} candles`);
      }

      // Sort by timestamp and remove duplicates
      allCandles.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      const uniqueCandles = allCandles.filter((c, i, arr) =>
        i === 0 || c.timestamp !== arr[i - 1].timestamp
      );

      console.log(`\n📊 Total unique candles: ${uniqueCandles.length}`);

      // Store in Supabase
      if (options.supabase !== false) {
        console.log('\n💾 Storing in Supabase...');
        const batchSize = 500;
        let stored = 0;

        for (let i = 0; i < uniqueCandles.length; i += batchSize) {
          const batch = uniqueCandles.slice(i, i + batchSize);
          const insertData = batch.map(candle => ({
            asset: symbolLower,
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
            .upsert(insertData, { onConflict: 'asset,timestamp' });

          if (error) {
            console.error(`  ❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
          } else {
            stored += batch.length;
            process.stdout.write(`\r  Stored ${stored}/${uniqueCandles.length} candles...`);
          }
        }
        console.log(`\n  ✓ Stored ${stored} candles in Supabase`);
      }

      // Export to merged CSV
      if (options.csv !== false) {
        const csvPath = join(outputDir, `${symbolUpper}-${interval}-${start}-to-${end}-lona.csv`);

        const csvHeader = 'Timestamp,Symbol,Open,High,Low,Close,Volume\n';
        const csvRows = uniqueCandles.map(c =>
          `${c.timestamp},${symbolUpper}-PERPETUAL,${c.open},${c.high},${c.low},${c.close},${c.volume}`
        ).join('\n');

        writeFileSync(csvPath, csvHeader + csvRows);
        console.log(`\n📄 Exported to: ${csvPath}`);
      }

      console.log(`\n✅ Done! ${uniqueCandles.length} candles from ${start} to ${end}`);

    } catch (error) {
      console.error('❌ Bulk download failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// ============================================
// CONVERT BINANCE CSV TO LONA FORMAT
// ============================================
program
  .command('convert-csv <input>')
  .description('Convert Binance CSV to Lona format and optionally store in Supabase')
  .option('-s, --symbol <symbol>', 'Trading symbol', 'btcusdt')
  .option('-o, --output <path>', 'Output file path (default: input-lona.csv)')
  .option('--store', 'Also store in Supabase')
  .action(async (input, options) => {
    try {
      const symbol = options.symbol.toLowerCase();
      const symbolUpper = symbol.toUpperCase();

      console.log(`📄 Converting: ${input}`);

      // Parse the CSV
      const candles = parseBinanceCSV(input, symbol);
      console.log(`✓ Parsed ${candles.length} candles`);

      // Generate output path
      const outputPath = options.output || input.replace('.csv', '-lona.csv');

      // Write Lona format CSV
      const csvHeader = 'Timestamp,Symbol,Open,High,Low,Close,Volume\n';
      const csvRows = candles.map(c =>
        `${c.timestamp},${symbolUpper}-PERPETUAL,${c.open},${c.high},${c.low},${c.close},${c.volume}`
      ).join('\n');

      writeFileSync(outputPath, csvHeader + csvRows);
      console.log(`✓ Exported to: ${outputPath}`);

      // Optionally store in Supabase
      if (options.store) {
        console.log('\n💾 Storing in Supabase...');
        const batchSize = 500;
        let stored = 0;

        for (let i = 0; i < candles.length; i += batchSize) {
          const batch = candles.slice(i, i + batchSize);
          const insertData = batch.map(candle => ({
            asset: symbol,
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
            .upsert(insertData, { onConflict: 'asset,timestamp' });

          if (!error) {
            stored += batch.length;
          }
        }
        console.log(`✓ Stored ${stored} candles in Supabase`);
      }

      console.log(`\n📊 Total: ${candles.length} candles`);
      console.log(`📅 Range: ${candles[0]?.timestamp} to ${candles[candles.length - 1]?.timestamp}`);

    } catch (error) {
      console.error('❌ Conversion failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// ============================================
// MERGE MULTIPLE CSV FILES
// ============================================
program
  .command('merge <output>')
  .description('Merge multiple Lona CSV files into one')
  .option('-d, --dir <directory>', 'Directory containing CSV files', 'data/binance/btcusdt/1m')
  .option('-p, --pattern <pattern>', 'File pattern to match', '*-lona.csv')
  .option('--store', 'Also store merged data in Supabase')
  .option('-s, --symbol <symbol>', 'Trading symbol (for Supabase)', 'btcusdt')
  .action(async (output, options) => {
    try {
      const dir = options.dir;
      console.log(`📦 Merging CSV files from: ${dir}`);

      // Find matching files
      const allFiles = readdirSync(dir);
      const files = allFiles
        .filter(f => f.endsWith('-lona.csv') && !f.includes('-to-'))
        .sort()
        .map(f => join(dir, f));

      if (files.length === 0) {
        console.log('❌ No matching files found');
        process.exit(1);
      }

      console.log(`✓ Found ${files.length} files to merge`);

      // Read and merge all files
      interface CandleRow { timestamp: string; line: string; }
      const allRows: CandleRow[] = [];
      let header = '';

      for (const file of files) {
        console.log(`  Reading: ${file}`);
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());

        if (!header && lines.length > 0) {
          header = lines[0];
        }

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const timestamp = line.split(',')[0];
          allRows.push({ timestamp, line });
        }
      }

      // Sort by timestamp
      allRows.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

      // Write merged file
      const mergedContent = header + '\n' + allRows.map(r => r.line).join('\n');
      writeFileSync(output, mergedContent);

      console.log(`\n✅ Merged ${allRows.length} candles -> ${output}`);
      console.log(`📅 Range: ${allRows[0]?.timestamp} to ${allRows[allRows.length - 1]?.timestamp}`);

      // Optionally store in Supabase
      if (options.store) {
        const symbol = options.symbol.toLowerCase();
        console.log('\n💾 Storing in Supabase...');

        const candles = allRows.map(r => {
          const parts = r.line.split(',');
          return {
            asset: symbol,
            timestamp: parts[0],
            open: parseFloat(parts[2]),
            high: parseFloat(parts[3]),
            low: parseFloat(parts[4]),
            close: parseFloat(parts[5]),
            volume: parseFloat(parts[6]),
            source: 'binance',
          };
        });

        const batchSize = 500;
        let stored = 0;

        for (let i = 0; i < candles.length; i += batchSize) {
          const batch = candles.slice(i, i + batchSize);
          const { error } = await supabaseAdmin
            .from('market_data')
            .upsert(batch, { onConflict: 'asset,timestamp' });

          if (!error) {
            stored += batch.length;
          }
        }
        console.log(`✓ Stored ${stored} candles in Supabase`);
      }

    } catch (error) {
      console.error('❌ Merge failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
