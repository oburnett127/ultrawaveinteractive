import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set(
    'Content-Security-Policy',
    `
      default-src 'self'; 
      script-src 'self' https://js.squareup.com https://accounts.google.com https://apis.google.com https://www.gstatic.com; 
      style-src 'self' 'unsafe-inline' https://js.squareup.com; 
      frame-src 'self' https://*.squarecdn.com https://accounts.google.com https://apis.google.com; 
      img-src 'self' data: https://*.squarecdn.com https://accounts.google.com https://www.googleapis.com; 
      connect-src 'self' https://connect.squareup.com https://*.squareupsandbox.com https://oauth2.googleapis.com https://accounts.google.com https://www.googleapis.com;
      object-src 'none';
    `.trim()
  );

  return response;
}
 