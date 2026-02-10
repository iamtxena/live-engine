import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define protected routes (dashboard)
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/websocket(.*)',
  '/api/historical(.*)',
  '/api/execute(.*)',
  '/api/convert(.*)',
  '/api/paper(.*)',
  '/api/strategies(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Service key bypass for CLI/machine access
  const serviceKey = process.env.SERVICE_API_KEY;
  const authHeader = req.headers.get('authorization');
  if (serviceKey && authHeader === `Bearer ${serviceKey}`) {
    return;
  }

  // Protect dashboard and API routes
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
