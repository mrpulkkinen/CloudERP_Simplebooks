import { NextRequest } from 'next/server';

import { forwardJson } from '../../_helpers/forward';

export async function POST(request: NextRequest) {
  return forwardJson(request, '/auth/register');
}
