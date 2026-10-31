import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SchoolCrest } from "@/components/ui/school-crest";
import { useAuth } from "@/hooks/useAuth";
import { changeMyPassword } from "@/lib/auth.functions";
import { changePasswordInput, MIN_PASSWORD_LENGTH, STARTING_PASSWORD } from "@/lib/password-rules";

/** Shown instead of portal pages until an account replaces the shared starting password. */
export function ForcePasswordChange() {
  const { userName, markPasswordChanged, signOut } = useAuth();
  const change = useServerFn(changeMyPassword);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) return setError("The two passwords do not match.");
    const parsed = changePasswordInput.safeParse({ currentPassword: STARTING_PASSWORD, newPassword });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Choose a different password.");
    setSaving(true);
    try {
      const result = await change({ data: parsed.data });
      if (!result.success) return setError(result.message);
      markPasswordChanged();
      toast.success("Your new password is saved.");
    } catch {
      setError("Your password could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-subtle p-4 animate-page-in">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="items-center text-center">
          <SchoolCrest className="mb-2 h-20 w-20" />
          <CardTitle className="flex items-center gap-2 text-xl"><KeyRound className="h-5 w-5 text-primary" />Choose your own password</CardTitle>
          <CardDescription>
            Welcome{userName ? `, ${userName}` : ""}! You signed in with the starting password. Pick a new one that only you know before you continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              <p className="text-xs text-muted-foreground">At least {MIN_PASSWORD_LENGTH} characters, and not 6667.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Type it again</Label>
              <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save my password
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => void signOut()}>Sign out</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
