import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:5010';

export async function forwardJson(request: NextRequest, path: string) {
  try {
    const bodyText = await request.text();

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: bodyText,
      cache: 'no-store'
    });

    const responseText = await response.text();
    const contentType = response.headers.get('content-type') ?? '';
    const parseJson = () => {
      try {
        return responseText.length > 0 ? JSON.parse(responseText) : null;
      } catch (jsonError) {
        console.error('Failed to parse API response', jsonError);
        return null;
      }
    };

    if (!response.ok) {
      if (contentType.includes('application/json')) {
        const json = parseJson();
        if (json !== null) {
          return NextResponse.json(json, {
            status: response.status
          });
        }
      }

      return new NextResponse(responseText, {
        status: response.status,
        headers: contentType ? { 'content-type': contentType } : undefined
      });
    }

    if (!responseText) {
      return new NextResponse(null, { status: response.status });
    }

    if (contentType.includes('application/json')) {
      const json = parseJson();
      if (json !== null) {
        return NextResponse.json(json, {
          status: response.status
        });
      }
    }

    return new NextResponse(responseText, {
      status: response.status,
      headers: contentType ? { 'content-type': contentType } : undefined
    });
  } catch (error) {
    console.error('Failed to forward request to API', error);
    return NextResponse.json(
      { error: { code: 'proxy_error', message: 'Unable to reach API service' } },
      { status: 502 }
    );
  }
}
