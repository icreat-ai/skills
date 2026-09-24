# Install iCreat AI Agent Skills

## Two-Step Install Order

**Step 1 is a MANUAL action by the user** (register the MCP connector in the client app — agents cannot and must not self-register). **Step 2 is run by the Agent** (`npx skills add`). Do not phrase Step 1 as an agent instruction; clients like Codex will refuse to self-register MCP servers by design.

## Recommended: Cross-Agent Install (Step 2)

Requires Node.js:

```bash
npx skills add icreat-ai/skills
```

Re-run the same command to update installed skills.

## GitHub CLI

If your GitHub CLI supports Skill installation:

```bash
gh skill install icreat-ai/skills
```

## Claude Code Marketplace

Inside Claude Code:

```text
/plugin marketplace add icreat-ai/skills
/plugin install icreat@icreat
```

## Setup Script

Use this fallback when the cross-agent installer is unavailable:

```bash
git clone https://github.com/icreat-ai/skills.git
cd skills
./setup --host codex
```

Supported hosts are `codex`, `claude`, and `cursor`. The script creates symlinks by default.

For WorkBuddy or another unsupported host, set its documented Skill directory explicitly:

```bash
WORKBUDDY_SKILLS_DIR="$HOME/path/to/workbuddy/skills" ./setup --host workbuddy
```

## Connect iCreat MCP (Step 1 — user manual action)

Register the connector yourself in the client UI or config file; the Agent cannot do this for you.

**Codex CLI** — one command (idempotent, backs up your config first):

```bash
curl -fsSL https://raw.githubusercontent.com/icreat-ai/skills/main/install-mcp-codex.sh | bash
```

Until the skills repo is published, copy `install-mcp-codex.sh` from this directory somewhere and run `bash install-mcp-codex.sh`. The script appends this block to `~/.codex/config.toml` (creating it if needed):

```toml
[mcp_servers.icreat-api-mcp]
url = "https://icreat.ai/mcp"
```

Save/restart `codex` afterwards — the connector list is only read at startup. Depending on your Codex version, streamable-HTTP MCP may additionally require `experimental_use_rmcp_client = true` in the same block — check the docs for your `codex --version`. Recent Codex versions also ship a `codex mcp add` command; check `codex mcp --help`.

**Codex Desktop / ChatGPT** — Settings → Connectors → Add custom connector: name `icreat-api-mcp`, URL `https://icreat.ai/mcp`.

**WorkBuddy and other custom-connector clients** — add a Streamable HTTP connector with URL `https://icreat.ai/mcp`. Do not use `/sse`.

**Verify Step 1 succeeded** (run in your own terminal, expect `v0.3.2`):

```bash
curl -sS https://icreat.ai/mcp -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26"}}'
```

**Step 2** (the Agent runs this): `npx skills add icreat-ai/skills` — see below.

The Skill guides the Agent through the connection. Streamable HTTP uses JSON-RPC over `POST /mcp`; do not configure `/sse` as the MCP endpoint.

Agents cannot register MCP servers in their own host application: the connector list is read at startup, the agent sandbox does not include the host config, and self-registration would be a prompt-injection escalation path. Configure it manually:

**Codex CLI** — add to `~/.codex/config.toml`:

```toml
[mcp_servers.icreat-api-mcp]
url = "https://icreat.ai/mcp"
```

Save and restart `codex`. Depending on your Codex version, streamable-HTTP MCP may additionally require `experimental_use_rmcp_client = true` in the same block — check the docs for your `codex --version`.

**Codex Desktop / ChatGPT** — Settings → Connectors → Add custom connector: name `icreat-api-mcp`, URL `https://icreat.ai/mcp`.

**WorkBuddy and other custom-connector clients** — add a Streamable HTTP connector with URL `https://icreat.ai/mcp`. Do not use `/sse`.

After installation, ask the Agent:

```text
Use iCreat to generate a small test image. First check the MCP account configuration, then discover models with list_models before generating.
```
