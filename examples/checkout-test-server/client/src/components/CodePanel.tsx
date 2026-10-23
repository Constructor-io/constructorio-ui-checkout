import { useEffect, useState } from "react";

interface CodePanelProps {
  title: string;
  description?: string;
  code: string;
  language?: "tsx" | "ts" | "js";
  defaultOpen?: boolean;
}

const PREF_KEY = "demo.codePanelOpen";

function readPref(fallback: boolean): boolean {
  try {
    const raw = sessionStorage.getItem(PREF_KEY);
    if (raw === "true") return true;
    if (raw === "false") return false;
  } catch {}
  return fallback;
}

export default function CodePanel({
  title,
  description,
  code,
  defaultOpen = true,
}: CodePanelProps) {
  const [open, setOpen] = useState(() => readPref(defaultOpen));

  useEffect(() => {
    try {
      sessionStorage.setItem(PREF_KEY, String(open));
    } catch {}
  }, [open]);

  return (
    <aside className={`code-panel ${open ? "open" : "closed"}`}>
      <button
        type="button"
        className="code-panel-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>{open ? "✕ Hide code" : "‹ Show code"}</span>
      </button>
      {open && (
        <div className="code-panel-body">
          <h3>{title}</h3>
          {description && <p className="code-panel-desc">{description}</p>}
          <pre>
            <code>{code}</code>
          </pre>
        </div>
      )}
    </aside>
  );
}
