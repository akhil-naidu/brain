# Brain Chat UI — Implementation Plans

Execute these plans **in order**. Each plan ends with a **Verifiable conclusion** — do not start the next plan until that checklist passes.

Spec: [`../specs/2026-07-29-brain-chat-ui-design.md`](../specs/2026-07-29-brain-chat-ui-design.md)  
Template mirror: `/Users/dev/github/tmp/eve-chat-template` @ `f7c164a` (see `.cursor/rules/eve-chat-template-reference.mdc`)  
Plan 01 status: **complete** (verifiable conclusion passed)
Plan 02 status: **complete** (verifiable conclusion passed)
Plan 03 status: **complete** (verifiable conclusion passed)
Plan 04 status: **complete** (verifiable conclusion passed)
Plan 05 status: **complete** (verifiable conclusion passed)
Plan 06 status: **complete** (verifiable conclusion passed)
Plan 07 status: **complete** (verifiable conclusion passed)

| # | Plan | Verifiable conclusion (summary) |
| --- | --- | --- |
| 01 | [Template reference + rules](./2026-07-30-01-template-reference.md) | Clone exists at `~/github/tmp/eve-chat-template`; Cursor rule present; sync command documented |
| 02 | [Next.js + withEve scaffold](./2026-07-30-02-nextjs-witheve-scaffold.md) | `npm run dev` serves a page; anonymous eve channel accepts a session create |
| 03 | [Ephemeral chat core](./2026-07-30-03-ephemeral-chat-core.md) | Send a message in the browser; assistant text streams; no DB writes |
| 04 | [Shell sidebar + new chat](./2026-07-30-04-shell-sidebar-new-chat.md) | Sidebar chrome visible; New chat clears the conversation |
| 05 | [Brain branding](./2026-07-30-05-brain-branding.md) | Straight-line brain mark + “Brain” title + teal/navy theme |
| 06 | [Connections menu](./2026-07-30-06-connections-menu.md) | Menu lists ClickUp/Slack/Asana/Gmail; toggles affect turn clientContext |
| 07 | [Strip leftovers + acceptance](./2026-07-30-07-strip-and-acceptance.md) | No auth/DB/Connect deps; full acceptance checklist from the spec passes |

## How to run

For each plan file: use **subagent-driven-development** (recommended) or **executing-plans**, task-by-task. After the plan’s Verifiable conclusion passes, commit that plan’s work, then open the next plan.

OpenSpec behavior contract for this work: `openspec/changes/add-brain-chat-ui/` (validate with `npm run openspec:validate`).
