import { NextRequest } from 'next/server';

import { getInternalApiUrl } from '../../../../../lib/config';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const baseUrl = getInternalApiUrl();
  const targetUrl = new URL(`/invoices/${params.id}/pdf`, baseUrl);
  const headers = new Headers(request.headers);
  headers.set('accept', 'application/pdf');
  headers.delete('host');
  headers.delete('content-length');

  const response = await fetch(targetUrl, {
    method: 'GET',
    headers,
    cache: 'no-store'
  });

  const body = await response.arrayBuffer();
  const nextHeaders = new Headers();
  const contentType = response.headers.get('content-type');
  if (contentType) {
    nextHeaders.set('content-type', contentType);
  }
  const contentDisposition = response.headers.get('content-disposition');
  if (contentDisposition) {
    nextHeaders.set('content-disposition', contentDisposition);
  }

  return new Response(body, {
    status: response.status,
    headers: nextHeaders
  });
}
