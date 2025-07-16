import { NextRequest, NextResponse } from 'next/server';
import { DevlogManager } from '@devlog/core';

const devlogManager = new DevlogManager();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or missing ids array' },
        { status: 400 }
      );
    }

    const result = await devlogManager.batchDelete({ ids });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Batch delete error:', error);
    return NextResponse.json(
      { error: 'Failed to batch delete devlogs' },
      { status: 500 }
    );
  }
}
