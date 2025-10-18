import Redis from 'ioredis';
import { log } from './logging';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

// Create three Redis clients for different purposes
const redis = new Redis(redisConfig);          // For regular operations
const redisPub = new Redis(redisConfig);       // For publishing
const redisSub = new Redis(redisConfig);       // For subscribing

redis.on('error', (error) => {
  console.error('Redis operations error:', error);
});

redisPub.on('error', (error) => {
  console.error('Redis publisher error:', error);
});

redisSub.on('error', (error) => {
  console.error('Redis subscriber error:', error);
});

// Store SSE connections by session ID
const sseConnections = new Map<string, Set<(message: any) => void>>();

export function addSSEConnection(sessionId: string, callback: (message: any) => void) {
  if (!sseConnections.has(sessionId)) {
    sseConnections.set(sessionId, new Set());
  }
  sseConnections.get(sessionId)!.add(callback);
  log(`Added SSE connection for session ${sessionId}`);
}

export function removeSSEConnection(sessionId: string, callback: (message: any) => void) {
  const connections = sseConnections.get(sessionId);
  if (connections) {
    connections.delete(callback);
    if (connections.size === 0) {
      sseConnections.delete(sessionId);
    }
  }
  log(`Removed SSE connection for session ${sessionId}`);
}

// Helper to format SSE message
export function formatSSEMessage(message: any): string {
  return `data: ${JSON.stringify(message)}\n\n`;
}


export async function sendMessageToConnections(sessionId: string, message: any) {
  try {
    // // Store as last message first
    // await setLastMessage(sessionId, message);
    
    // Send directly to SSE connections
    const connections = sseConnections.get(sessionId);
    if (connections && connections.size > 0) {
      log(`Sending message to ${connections.size} SSE connections for session ${sessionId}`);
      connections.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          log(`Error sending to SSE connection: ${JSON.stringify(error)}`);
        }
      });
    } else {
      log(`No SSE connections found for session ${sessionId}`);
    }
    
    return true;
  } catch (error) {
    log(`sendMessageToConnections error: ${JSON.stringify(error)}`);
    return false;
  }
}

// Publish message to incoming channel (BFF -> Backend)
export async function publishToIncomingStream(message: any) {
  try {
    await redisPub.publish('backend_inbound', JSON.stringify(message));
    log(`Published to backend_inbound channel: ${JSON.stringify(message)}`);
  } catch (error) {
    log(`Redis publishToIncomingStream error: ${JSON.stringify(error)}`);
    throw error;
  }
}

let outgoingSubscribed = false;

// Subscribe to outgoing channel only when needed
export async function ensureOutgoingSubscription() {
  if (outgoingSubscribed) {
    log('Outgoing subscription already active');
    return;
  }
  
  try {
    log('Starting backend_outbound channel subscription');
    outgoingSubscribed = true;
    
    await redisSub.subscribe('backend_outbound');
    log('Successfully subscribed to backend_outbound channel');
    
    redisSub.on('message', async (channel, messageStr) => {
      // log(`Received Redis message on channel: ${channel}`);
      if (channel === 'backend_outbound') {
        try {
          const message = JSON.parse(messageStr);
          log(`Processing backend_outbound message: ${messageStr}`);
          
          // Extract sessionId from message and send to SSE connections
          if (message.session_id) {
            await sendMessageToConnections(message.session_id, message);
          }
        } catch (error) {
          log(`Error processing backend_outbound message: ${JSON.stringify(error)}`);
        }
      }
    });
    
  } catch (error) {
    log(`Redis backend_outbound channel subscription error: ${JSON.stringify(error)}`);
    outgoingSubscribed = false;
    setTimeout(() => ensureOutgoingSubscription(), 5000);
  }
}