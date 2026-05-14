import { useEffect } from "react";
import { CognitoUserPool } from "amazon-cognito-identity-js";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const userPool = new CognitoUserPool({
  UserPoolId: "us-east-1_XZAMFaUHh",
  ClientId: "6jhjkp86f6rvtbd1r8dte087fr",
});

function getCognitoIdToken(): Promise<string | null> {
  return new Promise((resolve) => {
    const user = userPool.getCurrentUser();
    if (!user) { resolve(null); return; }
    user.getSession((err: any, session: any) => {
      if (err || !session?.isValid()) { resolve(null); return; }
      resolve(session.getIdToken().getJwtToken());
    });
  });
}

export function AuthBridge() {
  useEffect(() => {
    setAuthTokenGetter(getCognitoIdToken);
    return () => setAuthTokenGetter(null);
  }, []);
  return null;
}
