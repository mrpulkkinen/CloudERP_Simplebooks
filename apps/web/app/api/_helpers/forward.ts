import { NextRequest, NextResponse } from 'next/server';

import { getInternalApiUrl } from '../../../lib/config';

export async function forwardJson(request: NextRequest, path: string) {
  try {
    const baseUrl = getInternalApiUrl();
    const targetUrl = new URL(path, baseUrl);
    if (request.nextUrl.search) {
      targetUrl.search = request.nextUrl.search;
    }
    const method = request.method.toUpperCase();
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('content-length');

    if (!headers.has('accept')) {
      headers.set('accept', 'application/json');
    }

    if (method === 'GET' || method === 'HEAD') {
      headers.delete('content-type');
    } else if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }

    const bodyText = method === 'GET' || method === 'HEAD' ? undefined : await request.text();

    const response = await fetch(targetUrl, {
      method,
      headers,
      body: bodyText?.length ? bodyText : undefined,
      cache: 'no-store',
      redirect: 'manual'
    });

    const responseText = await response.text();
    const contentType = response.headers.get('content-type') ?? '';

    const applySetCookie = (nextResponse: NextResponse) => {
      const getSetCookie =
        (response.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ??
        (response.headers.get('set-cookie') ? [response.headers.get('set-cookie') as string] : []);

      for (const cookie of getSetCookie ?? []) {
        nextResponse.headers.append('set-cookie', cookie);
      }

      return nextResponse;
    };

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
          return applySetCookie(
            NextResponse.json(json, {
              status: response.status
            })
          );
        }
      }

      return applySetCookie(
        new NextResponse(responseText, {
          status: response.status,
          headers: contentType ? { 'content-type': contentType } : undefined
        })
      );
    }

    if (!responseText) {
      return applySetCookie(new NextResponse(null, { status: response.status }));
    }

    if (contentType.includes('application/json')) {
      const json = parseJson();
      if (json !== null) {
        return applySetCookie(
          NextResponse.json(json, {
            status: response.status
          })
        );
      }
    }

    return applySetCookie(
      new NextResponse(responseText, {
        status: response.status,
        headers: contentType ? { 'content-type': contentType } : undefined
      })
    );
  } catch (error) {
    console.error('Failed to forward request to API', error);
    return NextResponse.json(
      { error: { code: 'proxy_error', message: 'Unable to reach API service' } },
      { status: 502 }
    );
  }
}
