import { auth } from '@clerk/nextjs/server';

export async function getAuthUserId(req?: Request): Promise<string> {
  // Check service key first
  if (req) {
    const serviceKey = process.env.SERVICE_API_KEY;
    const authHeader = req.headers.get('authorization');
    if (serviceKey && authHeader === `Bearer ${serviceKey}`) {
      return 'service-account';
    }
  }
  // Fall back to Clerk
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  return userId;
}
