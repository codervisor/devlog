import { NextRequest, NextResponse } from 'next/server';
import { getDevlogManager } from '../../../lib/devlog-manager';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

function parseDevlogId(idParam: string): number {
  const id = parseInt(idParam, 10);
  if (isNaN(id)) {
    throw new Error(`Invalid devlog ID: ${idParam}`);
  }
  return id;
}

// GET /api/devlogs/[id] - Get devlog by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const devlogManager = await getDevlogManager();

    const id = parseDevlogId(params.id);
    const devlog = await devlogManager.getDevlog(id);
    
    if (!devlog) {
      return NextResponse.json({ error: 'Devlog not found' }, { status: 404 });
    }
    
    return NextResponse.json(devlog);
  } catch (error) {
    console.error('Error fetching devlog:', error);
    return NextResponse.json({ error: 'Failed to fetch devlog' }, { status: 500 });
  }
}

// PUT /api/devlogs/[id] - Update devlog
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const devlogManager = await getDevlogManager();

    const id = parseDevlogId(params.id);
    const data = await request.json();
    const devlog = await devlogManager.updateDevlog({ ...data, id });
    
    // Note: SSE broadcast happens automatically via DevlogManager event emission
    
    return NextResponse.json(devlog);
  } catch (error) {
    console.error('Error updating devlog:', error);
    return NextResponse.json({ error: 'Failed to update devlog' }, { status: 500 });
  }
}

// DELETE /api/devlogs/[id] - Delete devlog
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const devlogManager = await getDevlogManager();

    const id = parseDevlogId(params.id);
    await devlogManager.deleteDevlog(id);
    
    // Note: SSE broadcast happens automatically via DevlogManager event emission
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting devlog:', error);
    return NextResponse.json({ error: 'Failed to delete devlog' }, { status: 500 });
  }
}
