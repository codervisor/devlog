import { NextRequest, NextResponse } from 'next/server';
import { DevlogManager } from '@devlog/core';

const devlogManager = new DevlogManager();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, updates } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or missing ids array' },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Invalid or missing updates object' },
        { status: 400 }
      );
    }

    const result = await devlogManager.batchUpdate({ ids, updates });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Batch update error:', error);
    return NextResponse.json(
      { error: 'Failed to batch update devlogs' },
      { status: 500 }
    );
  }
}
