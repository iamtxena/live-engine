import * as fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
);

interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchFromBinance(startTime: number, endTime: number): Promise<Candle[]> {
  const allCandles: Candle[] = [];
  let currentStart = startTime;

  while (currentStart < endTime) {
    const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&startTime=${currentStart}&endTime=${endTime}&limit=1000`;

    console.log(`Fetching from ${new Date(currentStart).toISOString()}...`);

    const response = await fetch(url);
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      break;
    }

    const candles = data.map((c: number[]) => ({
      timestamp: new Date(c[0]).toISOString(),
      open: Number.parseFloat(String(c[1])),
      high: Number.parseFloat(String(c[2])),
      low: Number.parseFloat(String(c[3])),
      close: Number.parseFloat(String(c[4])),
      volume: Number.parseFloat(String(c[5])),
    }));

    allCandles.push(...candles);

    // Move to next batch
    const lastTimestamp = data[data.length - 1][0];
    currentStart = lastTimestamp + 1;

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 100));
  }

  return allCandles;
}

async function main() {
  const startDate = new Date('2025-11-01T00:00:00Z');
  const endDate = new Date('2025-12-14T23:59:59Z');

  console.log(
    `Downloading BTC/USDT 1h data from ${startDate.toISOString()} to ${endDate.toISOString()}`,
  );

  // Check existing data in Supabase
  console.log('\nChecking existing data in database...');
  const { data: existingData, error: checkError } = await supabase
    .from('market_data')
    .select('timestamp, open, high, low, close, volume')
    .eq('asset', 'btcusdt')
    .gte('timestamp', startDate.toISOString())
    .lte('timestamp', endDate.toISOString())
    .order('timestamp', { ascending: true });

  if (checkError) {
    console.error('Error checking existing data:', checkError);
  }

  const existingCount = existingData?.length || 0;
  console.log(`Found ${existingCount} existing records in database`);

  // Fetch from Binance
  console.log('\nFetching data from Binance...');
  const binanceData = await fetchFromBinance(startDate.getTime(), endDate.getTime());
  console.log(`Fetched ${binanceData.length} candles from Binance`);

  // Use Binance data as source of truth (more complete)
  const candles = binanceData;

  // Store in Supabase (upsert)
  console.log('\nStoring in Supabase...');
  const insertData = candles.map((c) => ({
    asset: 'btcusdt',
    timestamp: c.timestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
    source: 'binance',
  }));

  // Batch insert in chunks of 500
  for (let i = 0; i < insertData.length; i += 500) {
    const batch = insertData.slice(i, i + 500);
    const { error } = await supabase.from('market_data').upsert(batch, {
      onConflict: 'asset,timestamp',
    });
    if (error) {
      console.error(`Error inserting batch ${i / 500 + 1}:`, error);
    } else {
      console.log(
        `Inserted batch ${Math.floor(i / 500) + 1}/${Math.ceil(insertData.length / 500)}`,
      );
    }
  }

  // Export to CSV
  console.log('\nExporting to CSV...');
  const csvHeader = 'timestamp,open,high,low,close,volume';
  const csvRows = candles.map(
    (c) => `${c.timestamp},${c.open},${c.high},${c.low},${c.close},${c.volume}`,
  );
  const csvContent = [csvHeader, ...csvRows].join('\n');

  const outputPath = 'data/btcusdt-1h-nov-dec-2025.csv';

  // Ensure data directory exists
  if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
  }

  fs.writeFileSync(outputPath, csvContent);
  console.log(`\nExported ${candles.length} candles to ${outputPath}`);

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Period: ${startDate.toISOString()} to ${endDate.toISOString()}`);
  console.log(`Total candles: ${candles.length}`);
  console.log(`First candle: ${candles[0]?.timestamp}`);
  console.log(`Last candle: ${candles[candles.length - 1]?.timestamp}`);
  console.log(`Output file: ${outputPath}`);
}

main().catch(console.error);
