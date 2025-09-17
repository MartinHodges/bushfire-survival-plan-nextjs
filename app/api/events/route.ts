import { NextRequest } from 'next/server';

const clients = new Map<string, ReadableStreamDefaultController>();
const messageQueues = new Map<string, object[]>();

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId') || Date.now().toString();
  console.log(`[${new Date().toISOString()}] SSE GET request for session: ${sessionId}`);
  
  const stream = new ReadableStream({
    start(controller) {
      console.log(`[${new Date().toISOString()}] SSE controller created for session: ${sessionId}`);
      clients.set(sessionId, controller);
      controller.enqueue(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);
      
      // Send any queued messages
      const queue = messageQueues.get(sessionId) || [];
      queue.forEach(message => {
        try {
          controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);
        } catch (e) {
          console.error(`[${new Date().toISOString()}] SSE enqueue error for queued message:`, e);
        }
      });
      messageQueues.delete(sessionId);
      
    },
    cancel() {
      console.log(`[${new Date().toISOString()}] SSE controller cancelled for session: ${sessionId}`);
      clients.delete(sessionId);
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
  
  console.log(`SSE response created for session: ${sessionId}`);
  return response;
}

export function sendToClient(sessionId: string, data: object) {
  const controller = clients.get(sessionId);
  console.log('SSE sendToClient - sessionId:', sessionId, 'hasController:', !!controller);
  console.log('Active sessions:', Array.from(clients.keys()));
  if (controller) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    console.log(`SSE sending:[${new Date().toISOString()}]`, message);
    try {
      controller.enqueue(message);
    } catch (error) {
      console.error('SSE enqueue error:', error);
      clients.delete(sessionId);
    }
  } else {
    console.log('No SSE controller found for session:', sessionId, '- queuing message');
    const queue = messageQueues.get(sessionId) || [];
    queue.push(data);
    messageQueues.set(sessionId, queue.slice(-5)); // Keep last 5 messages
  }
}