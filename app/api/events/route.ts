import { NextRequest } from 'next/server';
import { log } from '@/utils/logging';
import { addSSEConnection, removeSSEConnection, formatSSEMessage, ensureOutgoingSubscription } from '@/utils/redis';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId') || '';
  const connectionId = crypto.randomUUID(); // Generate server-side only
  log(`SSE GET request - sessionId: ${sessionId}`);
  
  let messageCallback: ((message: any) => void) | null = null;
  
  const stream = new ReadableStream({
    start: async (controller) => {
      try {
        log(`(${connectionId}) SSE controller created`);
        
        // Ensure outgoing subscription is active
        await ensureOutgoingSubscription();
        
        // Add SSE connection callback
        messageCallback = (message: any) => {
          try {
            controller.enqueue(formatSSEMessage(message));
          } catch (error) {
            log(`(${connectionId}) Error processing message: ${JSON.stringify(error)}`);
          }
        };
        
        addSSEConnection(sessionId, messageCallback);
        
        // Send initial connection message
        controller.enqueue(formatSSEMessage({ 
          type: 'connected', 
          connectionId, 
          sessionId 
        }));
        
      } catch (error) {
        console.error(`[${new Date().toISOString()}] BFF SSE error: ${JSON.stringify(error)}`);
      }
    },
    cancel() {
      log(`(${connectionId}) BFF controller cancelled`);
      // Remove SSE connection
      if (messageCallback) {
        removeSSEConnection(sessionId, messageCallback);
      }
    }
  });

  const response = new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
  
  log(`(${connectionId}) SSE response created - sessionId: ${sessionId}`);
  return response;
}
