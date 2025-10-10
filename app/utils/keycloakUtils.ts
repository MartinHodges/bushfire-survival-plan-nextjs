import * as jose from 'jose';

// Define the shape of the decoded token payload claims you expect
interface KeycloakTokenPayload extends jose.JWTPayload {
  // Keycloak uses 'sub' for the user ID (subject)
  sub?: string;
  // Other Keycloak-specific claims you might need, e.g.
  realm_access?: {
    roles: string[];
  };
}

// Configuration details from your environment variables
const KEYCLOAK_ISSUER = process.env.KEYCLOAK_ISSUER_URL;
const KEYCLOAK_AUDIENCE = process.env.KEYCLOAK_CLIENT_ID;

if (!KEYCLOAK_ISSUER || !KEYCLOAK_AUDIENCE) {
  throw new Error("Missing Keycloak environment variables.");
}

/**
 * Verifies a Keycloak OAuth Bearer token and extracts the subject.
 * @param token The extracted Bearer token string.
 * @returns The subject (sub) string if valid, or null if invalid.
 */
export async function verifyKeycloakToken(token: string): Promise<string | null> {
  try {
    // 1. Setup the JWKS fetcher (Public Key Set)
    // The createRemoteJWKSet function fetches and caches the public keys from Keycloak's jwks_uri.
    const jwksUrl = new URL(KEYCLOAK_ISSUER + '/protocol/openid-connect/certs');
    const JWKS = jose.createRemoteJWKSet(jwksUrl);

    // 2. Verify the token signature and claims
    // The jwtVerify function does the heavy lifting:
    // - Fetches and uses the correct public key from JWKS to verify the signature.
    // - Checks the 'iss' (Issuer) claim.
    // - Checks the 'aud' (Audience) claim (your client ID).
    // - Checks the 'exp' (Expiration Time) claim.
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: KEYCLOAK_ISSUER,
      audience: KEYCLOAK_AUDIENCE,
    });

    // 3. Extract the subject ('sub') claim
    const typedPayload = payload as KeycloakTokenPayload;
    const subject = typedPayload.sub;

    if (!subject) {
      console.error('Token is valid but missing the required subject (sub) claim.');
      return null;
    }

    return subject;

  } catch (error) {
    // Handle specific verification errors (e.g., JWSInvalid, JWTExpired, JWTClaimValidationFailed)
    console.error('Token validation failed:', error);
    return null;
  }
}
