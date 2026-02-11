import { getCachedMarketTick } from '@/lib/redis';

/**
 * Server-Sent Events (SSE) endpoint for real-time market data streaming
 *
 * Usage: Connect via EventSource in browser:
 * const source = new EventSource('/api/stream?assets=btcusdt,ethusdt')
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assetsParam = searchParams.get('assets') || 'btcusdt,ethusdt';
  const assets = assetsParam.split(',').map((a) => a.trim().toLowerCase());

  // Create SSE response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isActive = true;

      // Send initial connection message
      const initialData = `data: ${JSON.stringify({
        type: 'connected',
        assets,
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(encoder.encode(initialData));

      // Store last known prices to detect changes
      const lastPrices = new Map<string, number>();

      // Poll Redis for latest market data every 1 second
      const poller = setInterval(async () => {
        if (!isActive) {
          clearInterval(poller);
          return;
        }

        try {
          // Fetch latest data for all assets
          const updates = await Promise.all(
            assets.map(async (asset) => {
              const tickData = await getCachedMarketTick(asset);
              if (!tickData) return null;

              // Only send if price changed
              const lastPrice = lastPrices.get(asset);
              if (lastPrice !== tickData.price) {
                lastPrices.set(asset, tickData.price);
                return {
                  asset,
                  ...tickData,
                };
              }
              return null;
            }),
          );

          // Send updates for changed prices
          for (const update of updates) {
            if (update) {
              const sseMessage = `data: ${JSON.stringify({
                type: 'ticker',
                ...update,
                timestamp: new Date().toISOString(),
              })}\n\n`;
              controller.enqueue(encoder.encode(sseMessage));
            }
          }
        } catch (error) {
          console.error('Error polling market data:', error);
        }
      }, 1000); // Poll every 1 second

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        if (!isActive) {
          clearInterval(heartbeat);
          return;
        }

        try {
          const heartbeatMessage = `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
          })}\n\n`;
          controller.enqueue(encoder.encode(heartbeatMessage));
        } catch (error) {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on connection close
      request.signal.addEventListener('abort', () => {
        isActive = false;
        clearInterval(poller);
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering for Nginx
    },
  });
}
