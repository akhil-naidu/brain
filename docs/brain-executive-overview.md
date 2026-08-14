# Brain: Executive Overview

**For:** Upwardly Global leadership and stakeholders  
**Date:** 14 August 2026  
**Companion:** *Technical Architecture: The Brain Platform* (engineering detail)

This is the non-technical view of the Proof of Concept: what was built, why it is not Claude or ChatGPT, why Azure AI Foundry matters, how the organization stays in control, which work tools are connected, why this is not a typical “chat over documents” product, and where it runs today.

---

## 1. What was done

Over the past two months, Brain was built as a **private AI workspace in the browser** for Upwardly Global. The goal was not another chatbot sitting beside Slack and ClickUp. The goal was one place where people already work — and where AI can *use* those systems, under the organization’s own login and hosting.

In that period the platform brought Upglobe’s live tools into a single signed-in experience: **Snowflake, Asana, Slack, ClickUp, Gmail, and GitHub**. Staff sign in, connect the apps they are allowed to use, and ask for briefs, status, drafts, and reports without exporting spreadsheets or pasting secrets into a public AI website.

Brain runs as **the organization’s own application**. Chat history stays on the organization’s host. People use their own accounts. Sensitive actions (sending a Slack message, changing a task, writing to a system) wait for a person to approve. Reusable “playbooks” and a scheduled morning brief were included so the same useful questions can run every day, not only in a demo.

This is the foundation for treating AI as part of daily operations, not as a side experiment.

---

## 2. Why we are not using Claude (or ChatGPT) as the product

Claude and ChatGPT are excellent **public products**. They are the wrong **home** for company work.

When someone drafts a proposal, a finance note, or an HR summary in claude.ai or ChatGPT, that conversation lives on someone else’s site. The organization does not control how long it is kept, where it is stored, who can retrieve it later, or whether it may be used to improve a vendor’s models. Those tools also do not log into Upglobe’s Slack, ClickUp, or Snowflake as *your* staff, with *your* permissions.

Brain is **our own client**:

- People sign in to **our** Brain, not to a consumer AI website.
- Conversations, saved playbooks, and schedules stay on **our** host.
- Connections to work apps belong to **each person in each team space** — not a shared bot that can see everything.
- The organization brings its own model access (keys and, when ready, its own Azure deployment).

We are not arguing that Claude is a weak model. We are arguing that **the product employees open should be ours**. The model behind the chat can still be a strong hosted model, or a private model in Azure. The *workspace* is not Anthropic’s and not OpenAI’s.

---

## 3. Why Azure AI Foundry

There is a difference between **renting a public chat API** and **owning a model environment**.

A usage-only endpoint is enough to try a prompt. It is a poor long-term home for an enterprise assistant: limited say over networking, logging, safety filters, custom models, and who may use which deployment.

**Azure AI Foundry** is that longer-term home. It is where the organization can:

- Deploy models inside **its own Azure boundary**
- Apply **content filters, logging, and access control** at the cloud layer
- **Fine-tune or customize** models for Upglobe’s language and work — training and governing the *model*, not bolting a search index onto a chatbot
- Grow from a first assistant into a governed set of models without changing the tool staff already open (Brain)

Brain and Foundry do different jobs. **Foundry is the model workshop.** **Brain is the workplace.** Staff never need to live inside the Azure console to ask for a morning brief. Admins point Brain at a Foundry deployment when the organization wants inference to stay in Azure. Until then, Brain can still run with a direct model key so the PoC did not block on Azure setup.

The advantage is strategic: intelligence becomes an asset the organization governs, not a tab on a public website.

---

## 4. Security and guardrails

Self-hosting is the first control: Brain is installed as Upglobe’s application (on dFlow Enterprise), not as a multi-tenant consumer app. Chat history and accounts live in the organization’s own database.

On top of that, Brain adds practical guardrails:

- **Login required.** There is no anonymous shared assistant.
- **Team spaces (workspaces).** Finance and programs can be separated. Switching space does not carry the other space’s conversations or app connections.
- **Roles.** A host administrator runs the install. In each space, owners and admins invite people and set up shared app credentials. Members chat and connect *their own* accounts. They cannot change the whole space’s keys.
- **Approval before doing.** Reading a board or a report can be automatic. Creating a task, sending Slack, or changing a system waits for a person to confirm in the chat.
- **A safer “ask only” mode.** When someone wants a plain answer and no tools, they can switch to Ask — the assistant cannot reach Slack or Snowflake on that turn.
- **Keys stay on the server.** Model keys and warehouse tokens are not shown in the browser.

If the selected model is hosted in Azure AI Foundry, inference can stay inside that Azure environment. If a public model key is used instead, that is a conscious choice, not a hidden leak through Claude’s website.

The organization is not locked into a single cloud vendor’s AI *product*. It is locked into **its own hosting and its own access rules**.

---

## 5. What is connected, what can be added, and who can see what

### Connected in this Proof of Concept

These live Upglobe systems were used in the PoC:

**Snowflake · Asana · Slack · ClickUp · Gmail · GitHub**

### Also ready in the product

The same pattern already supports more work systems, to turn on when needed:

**Notion · Linear · Atlassian (Jira / Confluence) · Sentry · dFlow · MongoDB · database tools (MCP Toolbox) · Zernio**

### What can be added later

Anything that speaks the same open “work tools” standard (MCP) can be added the way these were: official vendor connection, or a database/warehouse URL the organization already runs. New tools do not require moving the company onto a new suite. They require a connection, a login, and a decision about who is allowed to use it.

### Access (RBAC), in plain language

Think of three questions:

1. **Who may use this Brain install?** The first operator sets that. New people join by invite unless leadership opens sign-up.
2. **Which team space are they in?** Each space has its own chats and connections. A contractor in one space does not inherit another space’s Slack or warehouse access.
3. **What may they change?** Members work and connect their own apps. Admins invite colleagues and set up shared systems (for example Snowflake). Owners can hand the space to someone else. Only the host administrator changes install-wide settings and shared models.

App *logins* are personal. The Snowflake *connection* can be set up once for the space; people still only see what that connection and their Brain role allow. That is how finance can use live reporting without handing every staff member a warehouse password.

---

## 6. This is not “just RAG”

Most enterprise AI demos work like this: copy documents into a search index, retrieve snippets, and hope the index is still true tomorrow. That pattern (RAG) is useful for **handbooks**. It is a weak pattern for **operations**.

Boards, inboxes, and warehouses change all day. A copied index is already old. It is also a second copy of sensitive data sitting in yet another database.

Brain takes the harder, more current path:

- It does **not** vacuum Slack or Snowflake into a private search pile.
- It **asks the live system** at the moment of the question.
- When the organization wants a smarter or safer model, that work happens in **Azure AI Foundry** (customizing and governing the model) — not by teaching a chatbot a stack of stale files.

Staff still get a memory of *their conversations and playbooks* inside Brain. What they do not get is a shadow copy of the company’s systems. That is the difference between an application that looks intelligent and a workplace that stays accurate.

---

## 7. Connections stay “live” (stateless)

Older assistants often remember a snapshot: last week’s tasks, last month’s numbers. Brain’s connections are built so that **each request goes back to the source**.

Tokens are saved so people are not asked to log in every morning. The *data* is not saved as the assistant’s private copy. When finance asks for a figure, it is today’s warehouse. When a manager asks what is blocked, it is today’s board.

That is what “stateless” means here: the assistant does not live in a stale cache. It uses current tools, for the current person, in the current team space.

---

## 8. How team and finance actually used it

The PoC was aimed at real work, not a slide about productivity.

**Leadership and teams**

- A **morning brief**: what needs attention across tasks, Slack, and mail — in one chat, on a schedule if wanted.
- **Sprint blockers** read from the live board, not from a status meeting’s memory.
- A **Slack nudge** after someone approves sending it.
- **Inbox triage**: what needs a reply, with drafts remaining drafts until approved.
- **Playbooks**: the same useful prompt, reused by the team, not reinvented each Monday.

**Finance and operations**

- **Live reporting from Snowflake**, rather than a static export pasted into a chat window.
- The same question **saved and repeated** as a playbook or schedule, so the numbers follow the warehouse, not last week’s file.
- Warehouse credentials **set up by an admin**, not pasted into a public AI product.

If a tool is disconnected, or someone has not signed in to Slack, the assistant cannot pretend. That is a feature: it fails honestly instead of answering from an old copy.

---

## 9. Where it is deployed

Brain is running on **dFlow Enterprise** — the organization’s own hosting — with a separate path for testing and production so experiments do not sit on the same instance as daily use.

There is no requirement to put the company’s assistant on a public AI vendor’s cloud app, and no requirement to sign up for Vercel to make it work. Operators bring a database, set the public address, create the first administrator, and invite the team.

People then open Brain in the browser, connect the tools they use, and work. Deploy health can be inspected through the same assistant when dFlow itself is connected — the platform that hosts Brain can also be one of the tools it watches.

That completes the picture: a **private client**, a **model environment the organization can govern** (Azure AI Foundry), **live work systems**, **roles and approvals**, and an **enterprise deploy** that already exists — not a demo on a laptop.

---

*For implementation detail, connectors, and environment setup, see the companion technical architecture document. Operators can also open `/docs` on a running host (including `/docs/self-hosting/architecture`).*
