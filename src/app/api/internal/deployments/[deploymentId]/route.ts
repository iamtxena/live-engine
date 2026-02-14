import { getDeployment } from '@/lib/internal/execution-store';
import { getAuthUserId } from '@/lib/service-auth';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ deploymentId: string }> },
) {
  try {
    await getAuthUserId(request);
    const params = await context.params;
    const deployment = getDeployment(params.deploymentId);
    if (!deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }
    return NextResponse.json({ deployment });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch deployment' }, { status: 500 });
  }
}
