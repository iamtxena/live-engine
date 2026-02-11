import { type Asset, type Interval, fetchHistoricalCandles } from '@/lib/binance';
import { supabaseAdmin } from '@/lib/supabase';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * API Route: /api/historical
 *
 * Fetch and store historical market data
 * Supports date range via startTime and endTime (ISO strings or Unix ms)
 */

export async function POST(request: NextRequest) {
  try {
    const { symbol, interval, startTime, endTime, limit } = await request.json();

    if (!symbol) {
      return NextResponse.json({ error: 'Missing required parameter: symbol' }, { status: 400 });
    }

    // Convert ISO strings to Unix ms if provided
    const startMs = startTime
      ? typeof startTime === 'string'
        ? new Date(startTime).getTime()
        : startTime
      : undefined;
    const endMs = endTime
      ? typeof endTime === 'string'
        ? new Date(endTime).getTime()
        : endTime
      : undefined;

    // Fetch historical candles from Binance
    const candles = await fetchHistoricalCandles({
      symbol: symbol as Asset,
      interval: (interval || '1m') as Interval,
      limit: limit || 1000,
      startTime: startMs,
      endTime: endMs,
    });

    // Store in Supabase
    const insertData = candles.map(
      (candle: {
        timestamp: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      }) => ({
        asset: symbol.toLowerCase(),
        timestamp: candle.timestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        source: 'binance',
      }),
    );

    const { error } = await supabaseAdmin.from('market_data').upsert(insertData, {
      onConflict: 'asset,timestamp',
    });

    if (error) {
      console.error('Error storing historical data:', error);
      return NextResponse.json({ error: 'Failed to store historical data' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Downloaded ${candles.length} candles for ${symbol}`,
      count: candles.length,
      interval,
      data: candles.slice(0, 10), // Return first 10 for preview
    });
  } catch (error) {
    console.error('Historical data fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch historical data' }, { status: 500 });
  }
}

/**
 * GET: Query stored historical data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const limit = searchParams.get('limit') || '100';

    if (!symbol) {
      return NextResponse.json({ error: 'Missing required parameter: symbol' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('market_data')
      .select('*')
      .eq('asset', symbol.toLowerCase())
      .order('timestamp', { ascending: false })
      .limit(Number.parseInt(limit));

    if (start) {
      query = query.gte('timestamp', start);
    }

    if (end) {
      query = query.lte('timestamp', end);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error querying historical data:', error);
      return NextResponse.json({ error: 'Failed to query historical data' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      symbol,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error('Historical data query error:', error);
    return NextResponse.json({ error: 'Failed to query historical data' }, { status: 500 });
  }
}
