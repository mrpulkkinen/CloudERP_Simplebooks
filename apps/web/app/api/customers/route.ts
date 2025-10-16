import { NextRequest } from 'next/server';

import { forwardJson } from '../_helpers/forward';

export async function POST(request: NextRequest) {
  return forwardJson(request, '/customers');
}

export function OPTIONS() {
  return new Response(null, { status: 204 });
}
