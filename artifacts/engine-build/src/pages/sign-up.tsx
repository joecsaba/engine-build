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

export default function SignUpPage() {
  const { signUp, confirmSignUp } = useAuth();
  const [, setLocation] = useLocation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Verification step
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await signUp(email, password, name);
      setNeedsVerification(true);
    } catch (err: any) {
      setError(err.message || "Sign up failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifyError("");
    setVerifyLoading(true);
    try {
      await confirmSignUp(email, verificationCode);
      setLocation("/sign-in");
    } catch (err: any) {
      setVerifyError(err.message || "Verification failed. Please check your code.");
    } finally {
      setVerifyLoading(false);
    }
  }

  if (needsVerification) {
    return (
      <div>
        <PageHeader eyebrow="Account" title="Verify Your Email" />
        <div className="container mx-auto max-w-md px-4 py-10">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 mb-4">
                We sent a verification code to <strong>{email}</strong>. Enter it below to complete your registration.
              </p>
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <Label htmlFor="code" className="mb-1.5 block text-sm font-medium">
                    Verification Code
                  </Label>
                  <Input
                    id="code"
                    type="text"
                    required
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="123456"
                    autoComplete="one-time-code"
                  />
                </div>

                {verifyError && <p className="text-sm text-red-500">{verifyError}</p>}

                <Button
                  type="submit"
                  disabled={verifyLoading}
                  className="w-full bg-[#E85D04] hover:bg-[#E85D04]/90 text-white"
                >
                  {verifyLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Verify Email
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Account" title="Create an Account" />
      <div className="container mx-auto max-w-5xl px-4 py-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="order-2 lg:order-1">
          <SignupBenefits />
        </div>
        <Card className="order-1 lg:order-2">
          <CardContent className="p-6">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <Label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                  Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
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
                  placeholder="Create a password"
                  autoComplete="new-password"
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#E85D04] hover:bg-[#E85D04]/90 text-white"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Sign Up
              </Button>

              <p className="text-sm text-center text-gray-500 pt-1">
                Already have an account?{" "}
                <Link href="/sign-in" className="text-[#E85D04] hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
