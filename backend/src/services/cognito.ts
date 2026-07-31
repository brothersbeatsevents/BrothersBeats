// ──────────────────────────────────────────
// Cognito Token Verification Service
// Verifies JWT tokens issued by AWS Cognito User Pool
// ──────────────────────────────────────────

import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminCreateUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminListGroupsForUserCommand,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import https from 'https';

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || '';
const CLIENT_ID = process.env.COGNITO_CLIENT_ID || '';
const REGION =
  process.env.AWS_REGION || process.env.AWS_REGION_OVERRIDE || 'eu-west-1';

const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });

// ── JWKS Cache ──
interface JWK {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  n: string;
  e: string;
}

let jwksCache: JWK[] | null = null;
let jwksCacheExpiry = 0;
const JWKS_CACHE_TTL = 3600_000; // 1 hour

async function getJWKS(): Promise<JWK[]> {
  if (jwksCache && Date.now() < jwksCacheExpiry) return jwksCache;

  const url = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`;

  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk: string) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            jwksCache = parsed.keys as JWK[];
            jwksCacheExpiry = Date.now() + JWKS_CACHE_TTL;
            resolve(jwksCache!);
          } catch (e) {
            reject(new Error('Failed to parse JWKS'));
          }
        });
      })
      .on('error', reject);
  });
}

// ── JWT Verification (manual, no external JWKS library needed) ──

function base64UrlDecode(str: string): Buffer {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function decodeJwtHeader(token: string): { kid: string; alg: string } {
  const [headerB64] = token.split('.');
  if (!headerB64) throw new Error('Invalid token format');
  return JSON.parse(base64UrlDecode(headerB64).toString('utf-8'));
}

function decodeJwtPayload(token: string): CognitoTokenPayload {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  return JSON.parse(base64UrlDecode(parts[1]).toString('utf-8'));
}

// Verify token signature using Node.js crypto
import crypto from 'crypto';

function jwkToPem(jwk: JWK): string {
  // Convert JWK RSA public key to PEM format
  const n = base64UrlDecode(jwk.n);
  const e = base64UrlDecode(jwk.e);

  // DER encoding for RSA public key
  function encodeLengthHex(length: number): Buffer {
    if (length < 128) return Buffer.from([length]);
    const hexStr = length.toString(16);
    const lengthBytes = Buffer.from(
      hexStr.length % 2 ? '0' + hexStr : hexStr,
      'hex',
    );
    return Buffer.concat([
      Buffer.from([0x80 | lengthBytes.length]),
      lengthBytes,
    ]);
  }

  function derEncodeInteger(buf: Buffer): Buffer {
    // Prepend 0x00 if high bit set (to ensure positive integer)
    const needsPad = buf[0]! >= 0x80;
    const content = needsPad ? Buffer.concat([Buffer.from([0]), buf]) : buf;
    return Buffer.concat([
      Buffer.from([0x02]),
      encodeLengthHex(content.length),
      content,
    ]);
  }

  const nDer = derEncodeInteger(n);
  const eDer = derEncodeInteger(e);

  const seqContent = Buffer.concat([nDer, eDer]);
  const seq = Buffer.concat([
    Buffer.from([0x30]),
    encodeLengthHex(seqContent.length),
    seqContent,
  ]);

  // BitString wrapping
  const bitString = Buffer.concat([
    Buffer.from([0x03]),
    encodeLengthHex(seq.length + 1),
    Buffer.from([0x00]),
    seq,
  ]);

  // OID for rsaEncryption
  const oid = Buffer.from('300d06092a864886f70d0101010500', 'hex');

  const pubKeyContent = Buffer.concat([oid, bitString]);
  const pubKey = Buffer.concat([
    Buffer.from([0x30]),
    encodeLengthHex(pubKeyContent.length),
    pubKeyContent,
  ]);

  const b64 = pubKey.toString('base64');
  const lines = b64.match(/.{1,64}/g) || [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
}

async function verifyTokenSignature(
  token: string,
): Promise<CognitoTokenPayload> {
  const header = decodeJwtHeader(token);
  const jwks = await getJWKS();
  const key = jwks.find((k) => k.kid === header.kid);

  if (!key) throw new Error('Token signing key not found');

  const pem = jwkToPem(key);
  const [headerB64, payloadB64, signatureB64] = token.split('.');
  const signatureInput = `${headerB64}.${payloadB64}`;
  const signature = base64UrlDecode(signatureB64!);

  const isValid = crypto
    .createVerify('RSA-SHA256')
    .update(signatureInput)
    .verify(pem, signature);

  if (!isValid) throw new Error('Invalid token signature');

  const payload = decodeJwtPayload(token);

  // Validate claims
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error('Token expired');
  if (
    payload.iss !==
    `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`
  ) {
    throw new Error('Invalid token issuer');
  }
  if (payload.token_use !== 'id' && payload.token_use !== 'access') {
    throw new Error('Invalid token use');
  }
  // For id tokens, verify audience matches our client
  if (payload.token_use === 'id' && payload.aud !== CLIENT_ID) {
    throw new Error('Invalid token audience');
  }
  // For access tokens, verify client_id
  if (payload.token_use === 'access' && payload.client_id !== CLIENT_ID) {
    throw new Error('Invalid token client');
  }

  return payload;
}

// ── Types ──

export interface CognitoTokenPayload {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  'cognito:username'?: string;
  'cognito:groups'?: string[];
  token_use: 'id' | 'access';
  aud?: string;
  client_id?: string;
  iss: string;
  exp: number;
  iat: number;
  auth_time?: number;
}

// ── Public API ──

export async function verifyCognitoToken(
  token: string,
): Promise<CognitoTokenPayload> {
  if (!USER_POOL_ID) throw new Error('COGNITO_USER_POOL_ID not configured');
  return verifyTokenSignature(token);
}

export async function getCognitoUser(username: string) {
  const result = await cognitoClient.send(
    new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    }),
  );

  const attrs: Record<string, string> = {};
  result.UserAttributes?.forEach((attr) => {
    if (attr.Name && attr.Value) attrs[attr.Name] = attr.Value;
  });

  return {
    username: result.Username!,
    email: attrs.email,
    name: attrs.name,
    picture: attrs.picture,
    emailVerified: attrs.email_verified === 'true',
    status: result.UserStatus,
    enabled: result.Enabled,
    createdAt: result.UserCreateDate,
  };
}

export async function createCognitoUser(email: string, name: string) {
  return cognitoClient.send(
    new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: name },
      ],
      MessageAction: 'SUPPRESS', // Don't send welcome email — we use SES
    }),
  );
}

export async function updateCognitoUserAttributes(
  username: string,
  attributes: Record<string, string>,
) {
  return cognitoClient.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      UserAttributes: Object.entries(attributes).map(([Name, Value]) => ({
        Name,
        Value,
      })),
    }),
  );
}

export function isConfigured(): boolean {
  return !!USER_POOL_ID && !!CLIENT_ID;
}

// ── Direct Auth (email + password) ──

export async function authenticateUser(email: string, password: string) {
  const result = await cognitoClient.send(
    new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    }),
  );

  if (!result.AuthenticationResult) {
    throw new Error(result.ChallengeName || 'Authentication failed');
  }

  return {
    id_token: result.AuthenticationResult.IdToken!,
    access_token: result.AuthenticationResult.AccessToken!,
    refresh_token: result.AuthenticationResult.RefreshToken!,
    expires_in: result.AuthenticationResult.ExpiresIn || 3600,
  };
}

export async function signUpUser(
  email: string,
  password: string,
  name: string,
) {
  await cognitoClient.send(
    new SignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'name', Value: name },
      ],
    }),
  );
}

export async function confirmSignUp(email: string, code: string) {
  await cognitoClient.send(
    new ConfirmSignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
    }),
  );
}

export async function resendConfirmationCode(email: string) {
  await cognitoClient.send(
    new ResendConfirmationCodeCommand({
      ClientId: CLIENT_ID,
      Username: email,
    }),
  );
}

export async function forgotPassword(email: string) {
  await cognitoClient.send(
    new ForgotPasswordCommand({
      ClientId: CLIENT_ID,
      Username: email,
    }),
  );
}

export async function confirmForgotPassword(
  email: string,
  code: string,
  newPassword: string,
) {
  await cognitoClient.send(
    new ConfirmForgotPasswordCommand({
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
      Password: newPassword,
    }),
  );
}

export async function disableCognitoUser(username: string): Promise<void> {
  if (!USER_POOL_ID) return;
  await cognitoClient.send(
    new AdminDisableUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    }),
  );
}

export async function enableCognitoUser(username: string): Promise<void> {
  if (!USER_POOL_ID) return;
  await cognitoClient.send(
    new AdminEnableUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    }),
  );
}

export async function addUserToGroup(
  username: string,
  groupName: string,
): Promise<void> {
  if (!USER_POOL_ID) return;
  await cognitoClient.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      GroupName: groupName,
    }),
  );
}

export async function removeUserFromGroup(
  username: string,
  groupName: string,
): Promise<void> {
  if (!USER_POOL_ID) return;
  await cognitoClient.send(
    new AdminRemoveUserFromGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      GroupName: groupName,
    }),
  );
}

export async function getUserGroups(username: string): Promise<string[]> {
  if (!USER_POOL_ID) return [];
  const result = await cognitoClient.send(
    new AdminListGroupsForUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    }),
  );
  return (result.Groups || []).map((g) => g.GroupName!).filter(Boolean);
}

// Creates an admin-invited user (ADMIN or SUPER_ADMIN group), triggering
// Cognito's built-in invitation email with a temporary password.
export async function adminInviteUser(
  email: string,
  name: string,
  groupName: string,
) {
  await cognitoClient.send(
    new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: name },
      ],
      DesiredDeliveryMediums: ['EMAIL'],
    }),
  );
  await addUserToGroup(email, groupName);
}
