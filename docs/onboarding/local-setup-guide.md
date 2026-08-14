# Brain local setup — pin-to-pin

This is the document to send Amar (or anyone else) so they can install Brain on a laptop, chat with it, and point it at **Ollama on a VPS**. Follow the numbered steps in order. Do not skip the **check** after each section.

**What you will have when you finish**

- Brain running at [http://localhost:3000](http://localhost:3000)
- An operator account (you are the first admin)
- Chat working with a custom model (Ollama on a VPS)
- A short tour of Models, Tools, Workspaces, Playbooks, and docs

**Time:** about 45–90 minutes the first time (downloads dominate).

**OS:** steps are written for **macOS**. Linux is almost the same. Windows users should use **WSL2 (Ubuntu)** and then follow the Linux notes.

---

## 0. What Brain needs

Brain is a self-hosted chat app. Locally it needs:

| Piece | What you use |
| --- | --- |
| Runtime | Node.js **24** via **nvm**, package manager **pnpm** 11+ |
| Database | Postgres 16 via **Docker Compose** (included in the repo) |
| Auth | Better Auth (email + password). First visit creates the operator on `/setup` |
| Models | Either `COMMAND_CODE_API_KEY` **or** a custom OpenAI-compatible endpoint (Ollama) |

You do **not** need a Vercel account, Neon, or Vercel AI Gateway.

This walkthrough uses **Ollama on a VPS** as the model, so you can leave `COMMAND_CODE_API_KEY` empty.

---

## 1. Laptop tools

Open **Terminal** (macOS) or a Linux shell. Run every command. If a check already passes, skip that install.

### 1.1 Developer tools (macOS)

```bash
xcode-select --install
```

A dialog may appear. Install and wait until it finishes. If it says already installed, continue.

**Check**

```bash
xcode-select -p
```

You should see a path like `/Library/Developer/CommandLineTools` or `/Applications/Xcode.app/Contents/Developer`.

### 1.2 Homebrew (macOS)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow the printed “Next steps” (Apple Silicon often asks you to add Homebrew to `PATH`). Then:

```bash
brew --version
```

### 1.3 Git

macOS usually already has Git after step 1.1. Confirm:

```bash
git --version
```

If that fails:

```bash
brew install git
```

**Configure Git once** (use your real name and email — GitHub uses this on commits):

```bash
git config --global user.name "Your Name"
git config --global user.email "you@company.com"
git config --global init.defaultBranch main
```

**Check**

```bash
git config --global --list
```

You should see `user.name` and `user.email`.

### 1.4 nvm and Node 24

Brain requires **Node 24** (see `.nvmrc` in the repo). Use nvm so you do not fight a system Node.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

Close Terminal and open a **new** window (or run the two `export`/`source` lines the installer printed). Then:

```bash
command -v nvm
nvm --version
nvm install 24
nvm alias default 24
nvm use 24
```

**Check**

```bash
node -v
```

Must print `v24.x.x`. If you see 18, 20, or 22, run `nvm use 24` again in this terminal.

### 1.5 pnpm (via Corepack)

The repo **refuses npm/yarn**. Enable Corepack, then pin pnpm:

```bash
corepack enable
corepack prepare pnpm@11.13.1 --activate
pnpm --version
```

**Check:** version **11** or higher (11.13.1 is what the repo currently pins).

### 1.6 Docker Desktop

1. Install [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/).
2. Open Docker Desktop and wait until it says **Engine running**.
3. Leave it running whenever you use Brain locally.

**Check**

```bash
docker version
docker compose version
```

Both should print a version, not “Cannot connect to the Docker daemon”.

### 1.7 openssl

macOS and Linux already have this. You need it to generate auth secrets.

```bash
openssl version
```

---

### Linux notes

- Git: `sudo apt update && sudo apt install -y git curl build-essential`
- Docker: install Docker Engine + Compose plugin, add your user to the `docker` group, log out and back in
- nvm / Node 24 / Corepack / pnpm: same commands as above
- You do not need Homebrew or Xcode

### Windows notes

1. Install **WSL2** and **Ubuntu**.
2. Install **Docker Desktop** and enable the WSL2 backend.
3. Open Ubuntu and follow the Linux notes. Clone and run Brain **inside WSL**, not from `C:\`.

---

## 2. Clone the repo

You need **read access** to `https://github.com/akhil-naidu/brain`. If `git clone` asks for auth, use a GitHub login, SSH key, or personal access token.

HTTPS:

```bash
mkdir -p ~/dev
cd ~/dev
git clone https://github.com/akhil-naidu/brain.git
cd brain
```

SSH (if you already use GitHub SSH keys):

```bash
mkdir -p ~/dev
cd ~/dev
git clone git@github.com:akhil-naidu/brain.git
cd brain
```

**Check**

```bash
pwd
cat .nvmrc
git status
```

You should be inside `brain`, `.nvmrc` should contain `24`, and Git should be clean.

Switch to the branch your team uses if it is not `main` (today development often lives on `dev`):

```bash
git fetch origin
git checkout dev
git pull --ff-only
```

---

## 3. Node version in this folder + install packages

Always `nvm use` **inside** the repo so Node 24 is active:

```bash
cd ~/dev/brain    # or wherever you cloned
nvm use
node -v           # must be v24.x
corepack enable
pnpm install
```

`pnpm install` can take several minutes. The `postinstall` step runs Fumadocs MDX generation — that is expected.

**Check:** the command exits 0 and you have a `node_modules` folder. If it errors with “Use pnpm…”, you ran `npm install` — stop and use `pnpm install`.

---

## 4. Start local Postgres

From the **repo root**:

```bash
docker compose up -d db
```

Wait a few seconds, then:

```bash
docker compose ps
```

`db` should be **running** / healthy. Compose creates:

- Database `brain` (the app) — user `brain`, password `brain`
- Database `brain_test` (Vitest only — tests will not wipe your operator account)

**Check**

```bash
docker compose exec db pg_isready -U brain -d brain
```

Should print `accepting connections`.

If port **5432** is already used by another Postgres:

- Stop the other Postgres, **or**
- Change the host port in `docker-compose.yml` and use that port in `BRAIN_DATABASE_URL`

---

## 5. Create `.env`

From the repo root:

```bash
cp .env.example .env
```

Generate **two** secrets (session and bootstrap). Each command prints a new value — copy both:

```bash
openssl rand -base64 32   # → BETTER_AUTH_SECRET
openssl rand -base64 32   # → BRAIN_BOOTSTRAP_TOKEN
```

Open `.env` in an editor and **uncomment / set** at least these:

```bash
BETTER_AUTH_SECRET=paste-first-openssl-output
BRAIN_BOOTSTRAP_TOKEN=paste-second-openssl-output
BRAIN_DATABASE_URL=postgres://brain:brain@127.0.0.1:5432/brain
BRAIN_PUBLIC_URL=http://localhost:3000
BETTER_AUTH_URL=http://localhost:3000
```

| Variable | Why |
| --- | --- |
| `BETTER_AUTH_SECRET` | Signs login sessions |
| `BRAIN_BOOTSTRAP_TOKEN` | Required on `/setup` to create the first operator (same as production). Paste this value into the **Bootstrap token** field. |
| `BRAIN_DATABASE_URL` | Local Compose Postgres |
| `BRAIN_PUBLIC_URL` / `BETTER_AUTH_URL` | Browser origin (`http://localhost:3000`) |

Use **different** openssl outputs for the two secrets. Do not reuse one string for both.

Leave `COMMAND_CODE_API_KEY=` **empty** if you will use Ollama only (this walkthrough).

Do **not** commit `.env`. Do **not** paste real secrets into Slack/email.

**Check**

```bash
grep -E '^(BETTER_AUTH_SECRET|BRAIN_BOOTSTRAP_TOKEN|BRAIN_DATABASE_URL|BRAIN_PUBLIC_URL|BETTER_AUTH_URL)=' .env
```

All five should have values. Neither secret should be empty.

Optional later:

| Variable | When you need it |
| --- | --- |
| `COMMAND_CODE_API_KEY` | Built-in models in the picker (skip if Ollama-only) |
| `BRAIN_INTERNAL_TOKEN` | **Schedules only** — bearer between eve and Next so morning briefs / playbook timers can fire unattended. Skip for first chat. Generate with `openssl rand -base64 32`. |
| `BRAIN_INTERNAL_URL` | **Schedules only** — Next origin eve calls. Defaults to `http://127.0.0.1:3000`; set only if Next is not on that port. |
| MCP client ids | Only if you skip in-app Connect and use env fallbacks |

Full list: [`.env.example`](../../.env.example) and in-app `/docs/reference/environment`.

---

## 6. Run Brain

```bash
nvm use
pnpm dev
```

Keep this terminal open. You should see Next.js ready (port **3000**). Eve is proxied through Next.

**Check:** open [http://localhost:3000](http://localhost:3000) in a browser.

- Empty database → you will be sent toward **setup**
- If you already created an operator → **sign-in**

If the page errors, read the `pnpm dev` terminal. Typical causes: Docker not running, empty `BETTER_AUTH_SECRET`, wrong `BRAIN_DATABASE_URL`.

---

## 7. Create the operator account

1. Open [http://localhost:3000/setup](http://localhost:3000/setup)
2. You should see **Create operator**
3. Fill in:
   - **Name** — your display name
   - **Email** — you will use this to sign in
   - **Password** — at least **8** characters
   - **Bootstrap token** — paste the same value as `BRAIN_BOOTSTRAP_TOKEN` in `.env`
4. Click **Create account**

Because this walkthrough sets `BRAIN_BOOTSTRAP_TOKEN`, `/setup` will not succeed without that field. (If the token is omitted from `.env`, local/dev hides the field; production always requires it.)

After success you should land on **`/chat`**. A **personal workspace** is created for you. You are the **instance admin**.

If `/setup` says **Setup closed**, an operator already exists. Go to [http://localhost:3000/sign-in](http://localhost:3000/sign-in) instead.

To wipe local auth and start over:

```bash
docker compose down -v
docker compose up -d db
```

Then open `/setup` again.

---

## 8. Ollama on a VPS (model server)

Brain talks to any **OpenAI-compatible** `/v1` chat-completions endpoint. Ollama exposes that at `http://<host>:11434/v1`.

The Brain process on your **laptop** must be able to reach Ollama. Discovery times out after **4 seconds**, so the path must be fast.

### 8.1 On the VPS — install Ollama and pull a model

SSH into the VPS:

```bash
ssh YOUR_USER@YOUR_VPS_HOST
```

Install (Linux):

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

Pull a model (pick one your VPS RAM can hold). Example:

```bash
ollama pull llama3.2
```

Smaller options if RAM is tight: `llama3.2:1b`, `qwen2.5:3b`, `phi4-mini`.

**Check on the VPS**

```bash
ollama list
curl -sS http://127.0.0.1:11434/api/tags
```

You should see the model name in JSON.

Leave Ollama listening on **localhost** on the VPS. Do not expose port 11434 to the whole internet unless you know what you are doing.

### 8.2 On the laptop — SSH tunnel (recommended)

This makes VPS Ollama appear as `127.0.0.1:11434` on your laptop. Brain then uses the same URL as “local Ollama”.

**New Terminal window** (keep `pnpm dev` running in the other one):

```bash
ssh -N -L 11434:127.0.0.1:11434 YOUR_USER@YOUR_VPS_HOST
```

`-N` means “no remote shell, just forward ports”. Leave this window open.

**Check on the laptop**

```bash
curl -sS http://127.0.0.1:11434/api/tags
```

Same JSON as on the VPS. If this fails, the tunnel is down, the VPS Ollama is down, or local port 11434 is already taken.

If 11434 is busy locally (you already run Ollama on the laptop), use another local port:

```bash
ssh -N -L 11435:127.0.0.1:11434 YOUR_USER@YOUR_VPS_HOST
```

Then Brain’s base URL becomes `http://127.0.0.1:11435/v1`.

### 8.3 Alternative: public URL (not recommended for a first test)

Only if you cannot use SSH forwarding:

1. Bind Ollama on the VPS to `0.0.0.0:11434` (`OLLAMA_HOST`)
2. Firewall: allow **only your laptop’s IP**
3. In Brain, set base URL to `http://VPS_PUBLIC_IP:11434/v1` (or your HTTPS reverse-proxy URL)

Prefer HTTPS + IP allowlist if this VPS is on the public internet.

---

## 9. Add Ollama as a custom model in Brain

You must be signed in as the operator (instance admin).

1. In the left sidebar click **Models** (or open [http://localhost:3000/models](http://localhost:3000/models))
2. Under **Start with a model**, click the **Ollama** card  
   (If you already have models, click **Add model** instead)
3. In the **Add model** dialog:

   | Field | Value |
   | --- | --- |
   | Who can use this? | **Entire instance** (every workspace) — or **This workspace** if you only want it here |
   | Display name | `Ollama VPS` (any label you like) |
   | Base URL | `http://127.0.0.1:11434/v1` (or the forwarded port from 8.2) |
   | API key | leave empty |
   | Context window | `128000` is fine to start |

4. Click **Fetch models** (next to Base URL)
5. Click the model id you pulled (for example `llama3.2`) — it fills **Model id**
6. Click **Save**

You should see the model under **Your models** with badge **All workspaces** (or **This workspace**) and **No key**. Under **Available in chat** it should appear with source **Instance** or **Workspace**.

If **Fetch models** fails:

- Tunnel window still open?
- `curl http://127.0.0.1:11434/api/tags` works on the laptop?
- Base URL includes `/v1` at the end?
- VPS responded within 4 seconds?

You can still type the **Model id** by hand (exactly as `ollama list` shows) and Save.

---

## 10. Send a test chat

1. Sidebar → **New chat** (or [http://localhost:3000/chat](http://localhost:3000/chat))
2. In the composer, open the **model picker** and select **Ollama VPS** (your label)
3. Mode: leave **Agent**, or switch to **Ask** for a plain reply with no tools (**Shift+Tab** cycles modes)
4. Type: `Reply with exactly: Brain is running.`
5. Press **Enter**

You should get a streamed reply. That is the success test.

If you see **Chat isn't available**:

- No custom model saved, and no `COMMAND_CODE_API_KEY`
- Fix: complete section 9, or set a Command Code key and restart `pnpm dev`

If the turn errors:

- Tunnel dropped
- Wrong model id
- VPS out of memory / model not pulled
- Base URL missing `/v1`

---

## 11. Other features (plain tour)

You do not need to configure everything on day one. Click through so you know where things live.

| Go here | What it is |
| --- | --- |
| `/chat` | Main chat. Sidebar: New chat, history search (**⌘K** / **Ctrl+K**) |
| Composer **Ask** vs **Agent** | Ask = plain chat. Agent = MCP tools + coding tools when connected |
| Composer **Integrations** | Toggle which connected apps this chat may use |
| `/models` | Built-in (Command Code) + custom endpoints |
| `/tools` | MCP connections: Slack, GitHub, Notion, Linear, ClickUp, … |
| `/workspaces` | Switch or create workspaces (chats and tools are scoped here) |
| `/playbooks` | Saved prompts (label + text). **Run** opens chat with the prompt |
| `/schedules` | Timers for playbooks / morning brief — automatic runs need optional `BRAIN_INTERNAL_TOKEN` |
| `/projects` | Folders for chats |
| `/chats` | Full chat list (rename, pin, archive) |
| `/settings/account` | Display name, password, sessions |
| `/settings/instance` | Instance admin only: policies, users, license |
| `/docs` | In-app manual (same product docs) |

**Connections (Tools)** — typical flow, when you are ready:

1. Open `/tools`
2. Apps like **Notion** / **ClickUp**: click **Connect** (browser OAuth). No client id in `.env`
3. Apps like **GitHub** / **Slack**: a workspace or instance admin clicks **Set up** (OAuth app id/secret), then each user **Connect**
4. Toggle the app **on** for the current chat
5. Use **Agent** mode and ask it to use that app
6. Write actions may ask for **approval** in the stream — approve or deny

Local OAuth callbacks use `http://localhost:3000`. Register that origin in the provider’s OAuth app if you use Slack/GitHub/Gmail/Asana.

**Playbook smoke test (optional)**

1. `/playbooks` → create one with prompt `Say hello from a playbook.`
2. **Run** → confirm it opens chat with that text

Schedules that run unattended need optional env: `BRAIN_INTERNAL_TOKEN` (and `BRAIN_INTERNAL_URL` only if Next is not on `http://127.0.0.1:3000`). Skip until you care about morning briefs. Local `pnpm dev` does not fire the minute cron — use **Run now** on `/schedules`.

---

## 12. Day-to-day commands

From the repo root, Docker Desktop running:

```bash
nvm use
docker compose up -d db
pnpm dev
```

Open [http://localhost:3000/sign-in](http://localhost:3000/sign-in).

If you use the VPS Ollama tunnel, start it **before** chatting:

```bash
ssh -N -L 11434:127.0.0.1:11434 YOUR_USER@YOUR_VPS_HOST
```

Stop the app: **Ctrl+C** in the `pnpm dev` terminal. Postgres can stay up.

---

## 13. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `nvm: command not found` | Open a **new** terminal after installing nvm, or `source ~/.zshrc` |
| Wrong Node version | `cd` into the repo, `nvm use`, confirm `node -v` is v24 |
| `Use pnpm to install` | Do not use npm. `corepack enable && pnpm install` |
| Docker daemon not running | Start Docker Desktop, wait, retry |
| `BRAIN_DATABASE_URL` errors | `docker compose up -d db` and the URL in `.env` |
| `/setup` “Setup closed” | Operator exists → `/sign-in`. To reset: `docker compose down -v && docker compose up -d db` |
| `/setup` rejects bootstrap token | Value must match `BRAIN_BOOTSTRAP_TOKEN` in `.env` exactly |
| Chat unavailable | Add a custom model **or** set `COMMAND_CODE_API_KEY` and restart `pnpm dev` |
| Fetch models fails / chat ECONNREFUSED 11434 | SSH tunnel not running; curl `api/tags` on the laptop |
| Fetch models empty | Type model id from `ollama list` manually |
| OAuth redirect mismatch | `BRAIN_PUBLIC_URL` and `BETTER_AUTH_URL` must be `http://localhost:3000` locally |
| Tests wiped nothing / tests fail | Tests use `brain_test`. If missing: `docker compose exec db psql -U brain -d brain -c 'CREATE DATABASE brain_test;'` |

Quality gate (optional, needs Docker + `.env` database):

```bash
export BRAIN_DATABASE_URL=postgres://brain:brain@127.0.0.1:5432/brain
pnpm run verify
```

---

## 14. Optional: Command Code built-in models

If you have a Command Code API key:

1. Put `COMMAND_CODE_API_KEY=...` in `.env`
2. Restart `pnpm dev`
3. `/models` → **Available in chat** shows **Built-in** entries
4. Pick one in the composer

You can keep **both** Command Code and Ollama. Chat does not require Command Code when a usable custom model exists.

---

## Checklist (print this)

- [ ] Node `v24.x` (`nvm use` in the repo)
- [ ] `pnpm --version` ≥ 11
- [ ] Docker Desktop running
- [ ] `docker compose up -d db` healthy
- [ ] `.env` has `BETTER_AUTH_SECRET`, `BRAIN_BOOTSTRAP_TOKEN`, `BRAIN_DATABASE_URL`, `BRAIN_PUBLIC_URL`, `BETTER_AUTH_URL`
- [ ] `pnpm install` and `pnpm dev`
- [ ] `/setup` operator created (bootstrap token pasted), signed in at `/chat`
- [ ] VPS: `ollama pull …` and `curl` to `:11434/api/tags` works
- [ ] Laptop: SSH tunnel + `curl http://127.0.0.1:11434/api/tags`
- [ ] `/models` → Ollama → Fetch models → Save
- [ ] `/chat` → pick that model → get a reply
