import { NextRequest, NextResponse } from 'next/server';
import { DevlogManager } from '@devlog/core';

const devlogManager = new DevlogManager();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, content, category = 'progress', files, codeChanges } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or missing ids array' },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid or missing content' },
        { status: 400 }
      );
    }

    const result = await devlogManager.batchAddNote({
      ids,
      content: content.trim(),
      category,
      files,
      codeChanges,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Batch add note error:', error);
    return NextResponse.json(
      { error: 'Failed to batch add notes' },
      { status: 500 }
    );
  }
}
