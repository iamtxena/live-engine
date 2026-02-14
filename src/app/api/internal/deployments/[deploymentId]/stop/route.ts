import { getAuthUserId } from '@/lib/service-auth';
import { stopDeployment } from '@/lib/internal/execution-store';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ deploymentId: string }> },
) {
  try {
    await getAuthUserId(request);
    const params = await context.params;
    const deployment = stopDeployment(params.deploymentId);
    if (!deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }
    return NextResponse.json({ deployment });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to stop deployment' }, { status: 500 });
  }
}
