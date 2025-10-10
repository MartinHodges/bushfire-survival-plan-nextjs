import { NextRequest } from 'next/server'
import { verifyKeycloakToken } from '@/utils/keycloakUtils'

export async function GET(request: NextRequest) {

  try {
    // Check if we're in development mode
    const isDev = process.env.NODE_ENV === 'development' || process.env.USE_DEV_AUTH === 'true'
    
    if (isDev) {
      // Development fallback - use a consistent dev user ID
      return Response.json({ userId: 'dev-user-123' })
    }
    
    // Production: Extract user ID from OAuth token
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return Response.json({ error: 'No authorization header' }, { status: 401 })
    }
    
    // Extract JWT token and decode (simplified - in production use proper JWT library)
    const token = authHeader.replace('Bearer ', '')
    
    const subject = await verifyKeycloakToken(token)
    if (subject) {
      // Token is valid! Now you have the user ID/Subject
      // You can attach the subject to the request for downstream services
      console.log(`Authenticated Subject: ${subject}`);

      return Response.json({ userId: subject })
    } else {
      // Token verification failed (expired, invalid signature, wrong claims)
      return Response.json({ error: 'Invalid or expired token' }, { status: 401 })
    }
  } catch (error) {
    console.error('Auth error:', error)
    return Response.json({ error: 'Authentication failed' }, { status: 401 })
  }
}
