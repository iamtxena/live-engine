import { NextRequest, NextResponse } from 'next/server';
import { getBinanceWSClient, type Asset } from '@/lib/binance';

/**
 * API Route: /api/websocket
 *
 * Start multi-asset WebSocket feed
 * Streams real-time data to Supabase + Redis
 */

export async function POST(request: NextRequest) {
  try {
    const { assets } = await request.json();

    if (!assets || !Array.isArray(assets)) {
      return NextResponse.json(
        { error: 'Invalid assets parameter. Expected array of asset symbols.' },
        { status: 400 }
      );
    }

    // Initialize and connect WebSocket client
    const wsClient = getBinanceWSClient(assets as Asset[]);
    wsClient.connect();

    return NextResponse.json({
      success: true,
      message: `WebSocket connected for assets: ${assets.join(', ')}`,
      assets,
    });
  } catch (error) {
    console.error('WebSocket connection error:', error);
    return NextResponse.json(
      { error: 'Failed to start WebSocket connection' },
      { status: 500 }
    );
  }
}

/**
 * Stop WebSocket connection
 */
export async function DELETE() {
  try {
    const wsClient = getBinanceWSClient();
    wsClient.disconnect();

    return NextResponse.json({
      success: true,
      message: 'WebSocket disconnected',
    });
  } catch (error) {
    console.error('WebSocket disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect WebSocket' },
      { status: 500 }
    );
  }
}
