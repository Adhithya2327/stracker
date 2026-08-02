import { ActivitySquare, Github, ExternalLink } from "lucide-react";

//const STACK = ["Next.js", "TypeScript", "Supabase", "Gemini", "Tailwind", "Recharts"];

// Update these before publishing — placeholders for now.
const GITHUB_URL = "https://github.com/your-username/stracker";
const LINKS = [
  { label: "Source on GitHub", href: GITHUB_URL, external: true },
  { label: "Ingestion pipeline", href: `${GITHUB_URL}/tree/main/scripts`, external: true },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-hairline bg-panel/40">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="grid gap-12 sm:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <ActivitySquare className="h-4 w-4 text-saffron" strokeWidth={2} />
              <span className="font-display text-sm font-semibold text-text">
                Stracker
              </span>
            </div>
            <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-text-muted">
              A Nifty 50 news sentiment dashboard. Sentiment and impact
              summaries are AI-generated and provided for illustration only —
              not financial advice.
            </p>
          </div>

          <div>
            <div className="font-mono text-[11px] uppercase tracking-wide text-text-faint">
              Links
            </div>
            <ul className="mt-3 space-y-2">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="inline-flex items-center gap-1.5 text-[13px] text-text-muted transition-colors hover:text-saffron"
                  >
                    <Github className="h-3.5 w-3.5" />
                    {link.label}
                    {link.external && <ExternalLink className="h-3 w-3" />}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-hairline pt-5 font-mono text-[11px] text-text-faint sm:flex-row sm:items-center sm:justify-between">
          <span>© {year} Stracker — a portfolio project.</span>
          <span>Data refreshed manually via the ingestion pipeline, not live.</span>
        </div>
      </div>
    </footer>
  );
}
