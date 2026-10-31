import { classCrest } from "@/lib/images";
import { school } from "@/lib/school";
import { cn } from "@/lib/utils";

/** The school crest shown as a round badge with a brand-coloured ring. */
export function SchoolCrest({ className, alt }: { className?: string; alt?: string }) {
  return (
    <img
      src={classCrest.url}
      alt={alt ?? `${school.name} crest`}
      className={cn("shrink-0 rounded-full bg-card object-contain p-px ring-2 ring-primary shadow-sm", className)}
    />
  );
}
