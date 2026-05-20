import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  type CognitoUserSession,
} from "amazon-cognito-identity-js";

const poolData = {
  UserPoolId: "us-east-1_XZAMFaUHh",
  ClientId: "6jhjkp86f6rvtbd1r8dte087fr",
};

const userPool = new CognitoUserPool(poolData);

interface AuthUser {
  email: string;
  name: string;
  userId: string; // Cognito "sub"
}

interface AuthContextType {
  user: AuthUser | null;
  isSignedIn: boolean;
  isLoaded: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  signOut: () => void;
  forgotPassword: (email: string) => Promise<void>;
  confirmForgotPassword: (email: string, code: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function extractUser(session: CognitoUserSession, cognitoUser: CognitoUser): Promise<AuthUser> {
  return new Promise((resolve, reject) => {
    cognitoUser.getUserAttributes((err, attrs) => {
      if (err) {
        // Fallback: parse from the ID token
        const payload = session.getIdToken().decodePayload();
        resolve({
          email: (payload.email as string) ?? "",
          name: (payload.name as string) ?? (payload.email as string) ?? "",
          userId: (payload.sub as string) ?? "",
        });
        return;
      }
      const get = (key: string) => attrs?.find((a) => a.Name === key)?.Value ?? "";
      resolve({
        email: get("email"),
        name: get("name") || get("email"),
        userId: get("sub"),
      });
    });
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const currentUser = userPool.getCurrentUser();
    if (!currentUser) {
      setIsLoaded(true);
      return;
    }
    currentUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        setIsLoaded(true);
        return;
      }
      extractUser(session, currentUser).then((u) => {
        setUser(u);
        setIsLoaded(true);
      });
    });
  }, []);

  const signIn = useCallback((email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
      const authDetails = new AuthenticationDetails({ Username: email, Password: password });

      cognitoUser.authenticateUser(authDetails, {
        onSuccess(session) {
          extractUser(session, cognitoUser).then((u) => {
            setUser(u);
            resolve();
          });
        },
        onFailure(err) {
          reject(err);
        },
        newPasswordRequired(_userAttributes, _requiredAttributes) {
          // If Cognito forces a new password, reject with a typed error so
          // the sign-in page can handle it.
          const error = new Error("NEW_PASSWORD_REQUIRED");
          (error as any).cognitoUser = cognitoUser;
          reject(error);
        },
      });
    });
  }, []);

  const signUp = useCallback((email: string, password: string, name: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const attributes = [
        new CognitoUserAttribute({ Name: "email", Value: email }),
        new CognitoUserAttribute({ Name: "name", Value: name }),
      ];
      userPool.signUp(email, password, attributes, [], (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }, []);

  const confirmSignUp = useCallback((email: string, code: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
      cognitoUser.confirmRegistration(code, true, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }, []);

  const signOut = useCallback(() => {
    const currentUser = userPool.getCurrentUser();
    if (currentUser) {
      currentUser.signOut();
    }
    setUser(null);
  }, []);

  const forgotPassword = useCallback((email: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
      cognitoUser.forgotPassword({
        onSuccess() {
          resolve();
        },
        onFailure(err) {
          reject(err);
        },
      });
    });
  }, []);

  const confirmForgotPassword = useCallback(
    (email: string, code: string, newPassword: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
        cognitoUser.confirmPassword(code, newPassword, {
          onSuccess() {
            resolve();
          },
          onFailure(err) {
            reject(err);
          },
        });
      });
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isSignedIn: !!user,
        isLoaded,
        signIn,
        signUp,
        confirmSignUp,
        signOut,
        forgotPassword,
        confirmForgotPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
