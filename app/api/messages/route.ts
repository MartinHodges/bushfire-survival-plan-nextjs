import { NextRequest } from 'next/server'
import { log } from '@/utils/logging'
import { publishToIncomingStream } from '@/utils/redis'



export async function POST(request: NextRequest) {
  const { sessionId, connectionId, message } = await request.json();
  log(`(${connectionId}) Messages POST - sessionId: ${sessionId}`);
  
  try {
    if (message) {
      log(`(${connectionId}) Publishing to incoming stream: ${JSON.stringify(message)}`);
      await publishToIncomingStream(message);
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    log(`(${connectionId}) Error publishing to incoming stream: ${JSON.stringify(error)}`);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
