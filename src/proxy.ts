import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define protected routes (dashboard)
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/websocket(.*)',
  '/api/historical(.*)',
  '/api/execute(.*)',
  '/api/convert(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
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
