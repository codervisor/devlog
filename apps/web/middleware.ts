import { NextRequest, NextResponse } from 'next/server';

export default function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set('x-pathname', request.nextUrl.pathname);
  response.headers.set('x-url', request.url);

  return response;
}
