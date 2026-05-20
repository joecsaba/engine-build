import { CognitoUserPool } from "amazon-cognito-identity-js";

const userPool = new CognitoUserPool({
  UserPoolId: "us-east-1_XZAMFaUHh",
  ClientId: "6jhjkp86f6rvtbd1r8dte087fr",
});

/** Get the current Cognito ID token for API auth, or null if not signed in. */
function getAuthToken(): Promise<string | null> {
  return new Promise((resolve) => {
    const user = userPool.getCurrentUser();
    if (!user) { resolve(null); return; }
    user.getSession((err: any, session: any) => {
      if (err || !session?.isValid()) { resolve(null); return; }
      resolve(session.getIdToken().getJwtToken());
    });
  });
}

const API_BASE = "https://uzgrsju1d1.execute-api.us-east-1.amazonaws.com";

/** Fetch wrapper that attaches the Cognito auth token and routes /api/ calls to API Gateway. */
export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> ?? {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  // Route /api/ calls to API Gateway
  const fullUrl = url.startsWith("/api/") ? `${API_BASE}${url}` : url;
  return fetch(fullUrl, { ...init, headers });
}
