import { useState } from "react";
import { Link, useLocation } from "wouter";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { SignupBenefits } from "@/components/auth/SignupBenefits";

export default function SignInPage() {
  const { signIn } = useAuth();
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Forgot-password flow states
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotStep, setForgotStep] = useState<"email" | "code">("email");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  // NEW_PASSWORD_REQUIRED challenge
  const [newPasswordRequired, setNewPasswordRequired] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [challengeUser, setChallengeUser] = useState<any>(null);

  const { forgotPassword, confirmForgotPassword } = useAuth();

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await signIn(email, password);
      setLocation("/");
    } catch (err: any) {
      if (err.message === "NEW_PASSWORD_REQUIRED") {
        setNewPasswordRequired(true);
        setChallengeUser(err.cognitoUser);
      } else {
        setError(err.message || "Sign in failed. Please check your credentials.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        challengeUser.completeNewPasswordChallenge(newPassword, {}, {
          onSuccess() { resolve(); },
          onFailure(err: Error) { reject(err); },
        });
      });
      setLocation("/");
    } catch (err: any) {
      setError(err.message || "Failed to set new password.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    setForgotLoading(true);
    try {
      if (forgotStep === "email") {
        await forgotPassword(forgotEmail);
        setForgotStep("code");
        setForgotSuccess("Verification code sent to your email.");
      } else {
        await confirmForgotPassword(forgotEmail, forgotCode, forgotNewPassword);
        setForgotSuccess("Password reset successfully! You can now sign in.");
        setTimeout(() => {
          setShowForgot(false);
          setForgotStep("email");
          setForgotEmail("");
          setForgotCode("");
          setForgotNewPassword("");
          setForgotSuccess("");
        }, 2000);
      }
    } catch (err: any) {
      setForgotError(err.message || "Something went wrong.");
    } finally {
      setForgotLoading(false);
    }
  }

  // Forgot password modal / inline
  if (showForgot) {
    return (
      <div>
        <PageHeader eyebrow="Account" title="Reset Password" />
        <div className="container mx-auto max-w-md px-4 py-10">
          <Card>
            <CardContent className="p-6">
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                {forgotStep === "email" ? (
                  <div>
                    <Label htmlFor="forgotEmail" className="mb-1.5 block text-sm font-medium">
                      Email address
                    </Label>
                    <Input
                      id="forgotEmail"
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="forgotCode" className="mb-1.5 block text-sm font-medium">
                        Verification Code
                      </Label>
                      <Input
                        id="forgotCode"
                        type="text"
                        required
                        value={forgotCode}
                        onChange={(e) => setForgotCode(e.target.value)}
                        placeholder="123456"
                      />
                    </div>
                    <div>
                      <Label htmlFor="forgotNewPw" className="mb-1.5 block text-sm font-medium">
                        New Password
                      </Label>
                      <Input
                        id="forgotNewPw"
                        type="password"
                        required
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="New password"
                      />
                    </div>
                  </>
                )}

                {forgotError && (
                  <p className="text-sm text-red-500">{forgotError}</p>
                )}
                {forgotSuccess && (
                  <p className="text-sm text-green-600">{forgotSuccess}</p>
                )}

                <Button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-[#E85D04] hover:bg-[#E85D04]/90 text-white"
                >
                  {forgotLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {forgotStep === "email" ? "Send Reset Code" : "Reset Password"}
                </Button>

                <button
                  type="button"
                  onClick={() => { setShowForgot(false); setForgotStep("email"); setForgotError(""); setForgotSuccess(""); }}
                  className="text-sm text-[#E85D04] hover:underline w-full text-center block mt-2"
                >
                  Back to Sign In
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // New password required challenge
  if (newPasswordRequired) {
    return (
      <div>
        <PageHeader eyebrow="Account" title="Set New Password" />
        <div className="container mx-auto max-w-md px-4 py-10">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 mb-4">
                You need to set a new password before continuing.
              </p>
              <form onSubmit={handleNewPassword} className="space-y-4">
                <div>
                  <Label htmlFor="newPw" className="mb-1.5 block text-sm font-medium">
                    New Password
                  </Label>
                  <Input
                    id="newPw"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                  />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#E85D04] hover:bg-[#E85D04]/90 text-white"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Set Password & Sign In
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Default sign-in form
  return (
    <div>
      <PageHeader eyebrow="Account" title="Sign In" />
      <div className="container mx-auto max-w-5xl px-4 py-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="order-2 lg:order-1">
          <SignupBenefits />
        </div>
        <Card className="order-1 lg:order-2">
          <CardContent className="p-6">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <Label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <Label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  autoComplete="current-password"
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#E85D04] hover:bg-[#E85D04]/90 text-white"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Sign In
              </Button>

              <div className="flex items-center justify-between text-sm pt-1">
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-[#E85D04] hover:underline"
                >
                  Forgot password?
                </button>
                <Link href="/sign-up" className="text-[#E85D04] hover:underline">
                  Don't have an account? Sign up
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
