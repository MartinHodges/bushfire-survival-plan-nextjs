import { NextRequest } from 'next/server';
import { WebSocket } from 'ws';
import { sendToClient } from '../events/route';

const backendConnections = new Map<string, WebSocket>();
const BACKEND_WS_URL = process.env.BACKEND_WS_URL || 'ws://localhost:8000/ws';

export async function POST(request: NextRequest) {
  const { sessionId, message } = await request.json();
  try {
    let backendWs = backendConnections.get(sessionId);
    
    if (!backendWs || backendWs.readyState !== WebSocket.OPEN) {
      console.log(`[${new Date().toISOString()}] Connecting to backend server:`, BACKEND_WS_URL);
      backendWs = new WebSocket(BACKEND_WS_URL);
      backendConnections.set(sessionId, backendWs);
      
      backendWs.on('message', (data) => {
        console.log(`[${new Date().toISOString()}] Received from backend:`, data.toString());
        const parsedData = JSON.parse(data.toString());
        console.log(`[${new Date().toISOString()}] Sending to client via SSE:`, parsedData);
        sendToClient(sessionId, parsedData);
      });
      
      backendWs.on('close', () => {
        backendConnections.delete(sessionId);
      });
      
      backendWs.on('error', (error) => {
        console.error(`[${new Date().toISOString()}] Backend WebSocket error:`, error);
        backendConnections.delete(sessionId);
        sendToClient(sessionId, { type: 'error', data: 'Backend service unavailable' });
      });
    }
    
    if (backendWs.readyState === WebSocket.OPEN) {
      backendWs.send(JSON.stringify(message));
    } else {
      backendWs.on('open', () => {
        backendWs.send(JSON.stringify(message));
      });
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Connection error:`, error);
    sendToClient(sessionId, { type: 'error', data: 'Cannot connect to backend service' });
    return new Response(JSON.stringify({ success: false, error: 'Backend unavailable' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}