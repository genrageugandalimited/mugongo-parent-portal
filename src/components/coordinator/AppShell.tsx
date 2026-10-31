import { Link } from "@/lib/coordinator/navigation";
import { useState, type ReactNode } from "react";
import { Users, Vote, BarChart3, FileText } from "lucide-react";
import { SchoolAvatar } from "@/components/ui/school-avatar";
import { SchoolCrest } from "@/components/ui/school-crest";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePageView } from "@/hooks/use-coordinator";
import { useAuth } from "@/hooks/useAuth";

export function Crest({ className = "h-10 w-10" }: { className?: string }) {
  return <SchoolCrest className={className} />;
}

const nav = [
  { to: "/", label: "Candidates", icon: Users },
  { to: "/vote", label: "Vote", icon: Vote },
  { to: "/results", label: "Results", icon: BarChart3 },
  { to: "/apply", label: "Register", icon: FileText },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { userRole, photoUrl, userName, signOut } = useAuth();
  usePageView();
  return (
    <DashboardLayout userRole={userRole ?? "student"} userName={userName} photoUrl={photoUrl} onLogout={signOut}>
      <div className="election-shell mx-auto w-full max-w-3xl pb-10 text-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="leading-tight">
            <p className="font-display text-lg font-bold text-primary">KPM Elections 2026</p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Student council voting</p>
          </div>
        </div>
        <nav aria-label="Election sections" className="mt-4">
          <div className="grid grid-cols-4 rounded-2xl border border-primary/30 bg-card p-1.5 shadow-sm">
            {nav.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-medium election-tab sm:flex-row sm:justify-center sm:gap-2 sm:text-sm"
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            ))}
          </div>
        </nav>
        <div className="mt-2">{children}</div>
      </div>
    </DashboardLayout>
  );
}

export function CandidatePhoto({ name, url, className = "" }: { name: string; url: string | null; className?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return url && failedUrl !== url ? <img src={url} alt={name} loading="lazy" onError={() => setFailedUrl(url)} className={`object-cover ${className}`} /> : <SchoolAvatar name={name} className={className} />;
}
