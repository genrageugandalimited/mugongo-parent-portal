import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Check, Copy, Eye, EyeOff, KeyRound, Loader2, RefreshCw, ShieldCheck, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SchoolCrest } from "@/components/ui/school-crest";
import { useAuth } from "@/hooks/useAuth";
import { changeMyPassword } from "@/lib/auth.functions";
import { changePasswordInput, generateStrongPassword, passwordChecks, passwordStrength, STARTING_PASSWORD } from "@/lib/password-rules";
import { cn } from "@/lib/utils";

type Choice = "create" | "generate" | "keep";

const CHOICES: { id: Choice; title: string; badge: string; tone: "primary" | "success" | "warning"; icon: typeof KeyRound }[] = [
  { id: "create", title: "Create my own password", badge: "Recommended", tone: "primary", icon: KeyRound },
  { id: "generate", title: "Make a random password for me", badge: "Most secure", tone: "success", icon: Sparkles },
  { id: "keep", title: "Keep using my current password", badge: "Not recommended", tone: "warning", icon: AlertTriangle },
];

const BADGE_TONE = {
  primary: "border-primary/30 bg-primary/10 text-primary",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
};

const METER_TONE = ["bg-muted", "bg-destructive", "bg-warning", "bg-primary", "bg-success"];

/** Offered after signing in with the shared starting password: create, generate, or keep it for now. */
export function ForcePasswordChange() {
  const { userName, markPasswordChanged, keepCurrentPassword, signOut } = useAuth();
  const change = useServerFn(changeMyPassword);
  const [choice, setChoice] = useState<Choice>("create");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [generated, setGenerated] = useState("");
  const [savedIt, setSavedIt] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(password: string) {
    setError("");
    const parsed = changePasswordInput.safeParse({ currentPassword: STARTING_PASSWORD, newPassword: password });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Choose a different password.");
    setSaving(true);
    try {
      const result = await change({ data: parsed.data });
      if (!result.success) return setError(result.message);
      markPasswordChanged();
      toast.success("Your new password is saved. Use it next time you sign in.");
    } catch {
      setError("Your password could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function pick(next: Choice) {
    setChoice(next);
    setError("");
    if (next === "generate" && !generated) { setGenerated(generateStrongPassword()); setSavedIt(false); }
  }

  async function copyGenerated() {
    try {
      await navigator.clipboard.writeText(generated);
      toast.success("Password copied.");
    } catch {
      toast.error("Could not copy. Please write it down instead.");
    }
  }

  const strength = passwordStrength(newPassword);
  const checks = passwordChecks(newPassword);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-subtle p-4 animate-page-in">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="items-center text-center">
          <SchoolCrest className="mb-2 h-20 w-20" />
          <CardTitle className="flex items-center gap-2 text-xl"><ShieldCheck className="h-5 w-5 text-primary" />Protect your account</CardTitle>
          <CardDescription>
            Welcome{userName ? `, ${userName}` : ""}! You signed in with the starting password {STARTING_PASSWORD}, which every pupil knows. Choose what to do.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div role="radiogroup" aria-label="Password choice" className="grid gap-2">
            {CHOICES.map(({ id, title, badge, tone, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={choice === id}
                onClick={() => pick(id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                  choice === id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50",
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : "text-primary")} />
                <span className="flex-1 text-sm font-medium">{title}</span>
                <Badge variant="outline" className={cn("shrink-0", BADGE_TONE[tone])}>{badge}</Badge>
              </button>
            ))}
          </div>

          {choice === "create" && (
            <form onSubmit={(e) => { e.preventDefault(); if (newPassword !== confirm) return setError("The two passwords do not match."); void save(newPassword); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Input id="new-password" type={show ? "text" : "password"} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pr-10" required />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
                    {show ? <Eye className="h-4 w-4 text-muted-foreground" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2" aria-live="polite">
                  <div className="flex flex-1 gap-1">
                    {[1, 2, 3, 4].map((n) => <span key={n} className={cn("h-1.5 flex-1 rounded-full", strength.score >= n ? METER_TONE[strength.score] : "bg-muted")} />)}
                  </div>
                  <span className="w-14 text-right text-xs font-medium text-muted-foreground">{strength.label}</span>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="mb-2 text-xs font-semibold">A strong password has:</p>
                <ul className="space-y-1">
                  {checks.map((c) => (
                    <li key={c.id} className={cn("flex items-start gap-2 text-xs", c.met ? "text-success" : "text-muted-foreground")}>
                      {c.met ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                      {c.label}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">Use at least three of: small letters, capitals, numbers, symbols. Tip: join three random words with a number and symbol, like <span className="font-mono">Mango7!Kite-Drum</span>. Don't use your name or birthday.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Type it again</Label>
                <Input id="confirm-password" type={show ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save my password
              </Button>
            </form>
          )}

          {choice === "generate" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="generated-password">Your new password</Label>
                <div className="flex gap-2">
                  <Input id="generated-password" readOnly value={generated} className="font-mono text-base tracking-wider" onFocus={(e) => e.currentTarget.select()} />
                  <Button type="button" variant="outline" size="icon" onClick={copyGenerated} aria-label="Copy password"><Copy className="h-4 w-4" /></Button>
                  <Button type="button" variant="outline" size="icon" onClick={() => { setGenerated(generateStrongPassword()); setSavedIt(false); }} aria-label="Make another password"><RefreshCw className="h-4 w-4" /></Button>
                </div>
                <p className="text-xs text-muted-foreground">Made just now on this device with a secure random generator. Write it down or save it somewhere safe before you continue — the school can't see it later.</p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="saved-it" checked={savedIt} onCheckedChange={(v) => setSavedIt(v === true)} />
                <Label htmlFor="saved-it" className="cursor-pointer text-sm font-normal">I have written down or saved this password</Label>
              </div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="button" className="w-full" disabled={saving || !savedIt || !generated} onClick={() => void save(generated)}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Use this password
              </Button>
            </div>
          )}

          {choice === "keep" && (
            <div className="space-y-4">
              <div className="flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <p>Everyone at school knows {STARTING_PASSWORD}. Anyone could sign in as you, change your details or vote in your name. We'll ask you again next time you sign in.</p>
              </div>
              <Button type="button" variant="outline" className="w-full" onClick={keepCurrentPassword}>Keep {STARTING_PASSWORD} for now</Button>
            </div>
          )}

          <Button type="button" variant="ghost" className="w-full" onClick={() => void signOut()}>Sign out</Button>
        </CardContent>
      </Card>
    </div>
  );
}
