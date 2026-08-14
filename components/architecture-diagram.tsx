import { cn } from "@/lib/utils";

const TITLE = "Brain logical architecture";
const DESC =
  "Signed-in browser talks to Brain on dFlow Enterprise. Brain stores product data in Postgres, calls Command Code or Azure AI Foundry for models, and fetches live work data through stateless MCP.";

export function ArchitectureDiagram({ className }: { readonly className?: string }) {
  return (
    <svg
      aria-labelledby="brain-arch-title brain-arch-desc"
      className={cn("brain-architecture-diagram h-auto w-full", className)}
      viewBox="0 0 1100 720"
    >
      <title id="brain-arch-title">{TITLE}</title>
      <desc id="brain-arch-desc">{DESC}</desc>

      <text className="label caption" textAnchor="middle" x="550" y="28">
        PEOPLE
      </text>
      <rect className="people" height="56" rx="8" width="350" x="375" y="40" />
      <text className="label title" textAnchor="middle" x="550" y="64">
        Signed-in staff
      </text>
      <text className="label sub" textAnchor="middle" x="550" y="82">
        Browser / Chat / Tools / Models / Schedules
      </text>

      <line className="edge" x1="550" x2="550" y1="96" y2="132" />
      <polygon className="edge" points="550,136 545,126 555,126" />
      <text className="label caption" x="568" y="120">
        HTTPS
      </text>

      <rect className="host" height="168" rx="10" width="960" x="70" y="148" />
      <text className="label caption" x="90" y="172">
        APPLICATION - BRAIN ON DFLOW ENTERPRISE
      </text>

      <rect className="box" height="88" rx="8" width="280" x="100" y="196" />
      <text className="label title" textAnchor="middle" x="240" y="232">
        Next.js
      </text>
      <text className="label sub" textAnchor="middle" x="240" y="252">
        UI on :3000
      </text>

      <rect className="box" height="88" rx="8" width="280" x="410" y="196" />
      <text className="label title" textAnchor="middle" x="550" y="232">
        eve agent runtime
      </text>
      <text className="label sub" textAnchor="middle" x="550" y="252">
        Sessions, streaming, MCP, approvals
      </text>

      <rect className="box" height="88" rx="8" width="280" x="720" y="196" />
      <text className="label title" textAnchor="middle" x="860" y="232">
        Better Auth
      </text>
      <text className="label sub" textAnchor="middle" x="860" y="252">
        Workspaces, roles, HITL
      </text>

      <line className="edge" x1="380" x2="410" y1="240" y2="240" />
      <line className="edge" x1="690" x2="720" y1="240" y2="240" />

      <line className="edge" x1="240" x2="240" y1="316" y2="368" />
      <polygon className="edge" points="240,372 235,362 245,362" />
      <text className="label caption" x="252" y="350">
        PRODUCT DATA
      </text>

      <line className="edge" x1="550" x2="550" y1="316" y2="368" />
      <polygon className="edge" points="550,372 545,362 555,362" />
      <text className="label caption" x="562" y="350">
        INFERENCE
      </text>

      <line className="edge" x1="860" x2="860" y1="316" y2="368" />
      <polygon className="edge" points="860,372 855,362 865,362" />
      <text className="label caption" x="872" y="350">
        LIVE TOOLS
      </text>

      <rect className="data" height="196" rx="10" width="340" x="70" y="384" />
      <text className="label caption" textAnchor="middle" x="240" y="412">
        PRODUCT DATABASE
      </text>
      <text className="label title" textAnchor="middle" x="240" y="448">
        Operator Postgres
      </text>
      <text className="label sub" textAnchor="middle" x="240" y="472">
        Accounts, chats, playbooks,
      </text>
      <text className="label sub" textAnchor="middle" x="240" y="490">
        schedules - not a copy of Slack
      </text>
      <text className="label sub" textAnchor="middle" x="240" y="508">
        or Snowflake
      </text>

      <rect className="model" height="196" rx="10" width="240" x="430" y="384" />
      <text className="label caption" textAnchor="middle" x="550" y="412">
        MODEL PLANE
      </text>
      <rect className="box" height="56" rx="6" width="200" x="450" y="432" />
      <text className="label title" textAnchor="middle" x="550" y="454">
        Command Code
      </text>
      <text className="label sub" textAnchor="middle" x="550" y="472">
        Default BYOK
      </text>
      <rect className="box" height="56" rx="6" width="200" x="450" y="500" />
      <text className="label title" textAnchor="middle" x="550" y="522">
        Azure AI Foundry
      </text>
      <text className="label sub" textAnchor="middle" x="550" y="540">
        Custom / private BYOA
      </text>

      <rect className="mcp" height="196" rx="10" width="340" x="690" y="384" />
      <text className="label caption" textAnchor="middle" x="860" y="412">
        STATELESS MCP
      </text>
      <text className="label title" textAnchor="middle" x="860" y="444">
        Live fetch at request time
      </text>
      <text className="label sub" textAnchor="middle" x="860" y="470">
        ClickUp, Slack, Asana
      </text>
      <text className="label sub" textAnchor="middle" x="860" y="488">
        Gmail, GitHub
      </text>
      <text className="label sub" textAnchor="middle" x="860" y="514">
        Snowflake, MongoDB
      </text>
      <text className="label sub" textAnchor="middle" x="860" y="532">
        MCP Toolbox, dFlow
      </text>
      <text className="label sub" textAnchor="middle" x="860" y="556">
        Writes require in-chat approval
      </text>

      <text className="label sub" textAnchor="middle" x="550" y="616">
        Brain owns accounts and transcripts. Work data stays in the source systems. Models are
        called at an endpoint the organization chooses.
      </text>
      <text className="label caption" textAnchor="middle" x="550" y="640">
        BRAIN LOGICAL ARCHITECTURE - DFLOW ENTERPRISE - AUGUST 2026
      </text>
    </svg>
  );
}

export function ArchitectureDiagramFrame({ className }: { readonly className?: string }) {
  return (
    <figure
      className={cn(
        "border-border/70 bg-card overflow-hidden rounded-2xl border p-3 shadow-sm sm:p-5",
        className,
      )}
    >
      <ArchitectureDiagram />
    </figure>
  );
}
