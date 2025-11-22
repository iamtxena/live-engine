import { NextRequest, NextResponse } from 'next/server';
import { fetchHistoricalCandles, type Asset } from '@/lib/binance';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * API Route: /api/historical
 *
 * Fetch and store historical market data
 * Supports bulk download of candles (1m, 5m, 1h, 1d, etc.)
 */

export async function POST(request: NextRequest) {
  try {
    const { symbol, interval, limit } = await request.json();

    if (!symbol) {
      return NextResponse.json(
        { error: 'Missing required parameter: symbol' },
        { status: 400 }
      );
    }

    // Fetch historical candles from Binance
    const candles = await fetchHistoricalCandles(
      symbol as Asset,
      interval || '1m',
      limit || 500
    );

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
      console.error('Error storing historical data:', error);
      return NextResponse.json(
        { error: 'Failed to store historical data' },
        { status: 500 }
      );
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
    return NextResponse.json(
      { error: 'Failed to fetch historical data' },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: 'Missing required parameter: symbol' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from('market_data')
      .select('*')
      .eq('asset', symbol.toLowerCase())
      .order('timestamp', { ascending: false })
      .limit(parseInt(limit));

    if (start) {
      query = query.gte('timestamp', start);
    }

    if (end) {
      query = query.lte('timestamp', end);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error querying historical data:', error);
      return NextResponse.json(
        { error: 'Failed to query historical data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      symbol,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error('Historical data query error:', error);
    return NextResponse.json(
      { error: 'Failed to query historical data' },
      { status: 500 }
    );
  }
}
