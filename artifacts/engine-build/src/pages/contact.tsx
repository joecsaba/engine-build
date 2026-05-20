import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, CheckCircle2, Mail, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("https://formspree.io/f/xvzdknrj", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) throw new Error("Failed");
      setSubmitted(true);
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <SEOHead
        title="Contact Us | Engine-build.com"
        description="Get in touch with the Engine-build.com team. Request a calculator, report an issue, suggest a feature, or ask a question about engine building."
        canonical="/contact"
        keywords="contact engine-build.com, engine building help, calculator request, engine build question"
      />

      <PageHeader
        eyebrow="Get in Touch"
        title="Contact Us"
        subtitle="Have a question, found a bug, or want to request a calculator? We read every message."
      />

      <div className="container mx-auto max-w-4xl px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contact info */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#E85D04]" />
                  Email
                </CardTitle>
              </CardHeader>
              <CardContent>
                <a href="mailto:joe@engine-build.com" className="text-[#E85D04] hover:underline font-medium">
                  joe@engine-build.com
                </a>
                <p className="text-sm text-muted-foreground mt-2">
                  For general questions, partnership inquiries, or data corrections.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#E85D04]" />
                  What We Want to Hear
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">Calculator requests</strong> &mdash; What tool are you missing? We've built 40+ based on builder feedback.</p>
                <p><strong className="text-foreground">Data corrections</strong> &mdash; Found a wrong spec? Tell us the engine and the correct value with your source.</p>
                <p><strong className="text-foreground">Bug reports</strong> &mdash; If a calculator gives a wrong answer or something breaks, we want to know immediately.</p>
                <p><strong className="text-foreground">Feature ideas</strong> &mdash; Build sheets, comparison tools, export options &mdash; we're always building.</p>
              </CardContent>
            </Card>
          </div>

          {/* Contact form */}
          <div className="md:col-span-2">
            {submitted ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Message Sent</h3>
                  <p className="text-muted-foreground mb-4">
                    Thanks for reaching out. We read every message and typically respond within 24&ndash;48 hours.
                  </p>
                  <Button variant="outline" onClick={() => setSubmitted(false)}>
                    Send Another Message
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Send Us a Message</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Name</label>
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">
                          Email <span className="text-muted-foreground font-normal">(so we can reply)</span>
                        </label>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">
                        Message <span className="text-red-500">*</span>
                      </label>
                      <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        rows={6}
                        placeholder="What calculator would you like to see? Found a bug? Have a question about your build?"
                      />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <Button
                      type="submit"
                      disabled={submitting || !message.trim()}
                      className="w-full bg-[#E85D04] hover:bg-[#d04f00] text-white font-semibold gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {submitting ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
