import { auth } from '@clerk/nextjs/server';

const CLERK_USER_ID_PATTERN = /^user_[a-zA-Z0-9]{20,}$/;

export async function getAuthUserId(req?: Request): Promise<string> {
  // Check service key first
  if (req) {
    const serviceKey = process.env.SERVICE_API_KEY;
    const authHeader = req.headers.get('authorization');
    if (serviceKey && authHeader === `Bearer ${serviceKey}`) {
      // Allow caller to specify which user to act on behalf of
      const onBehalfOf = req.headers.get('x-user-id');
      if (onBehalfOf && CLERK_USER_ID_PATTERN.test(onBehalfOf)) {
        return onBehalfOf;
      }
      return 'service-account';
    }
  }
  // Fall back to Clerk
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  return userId;
}
