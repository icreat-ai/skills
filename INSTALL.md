# Install iCreat AI Agent Skills

## Recommended: Cross-Agent Install

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

## Connect iCreat MCP

The Skill guides the Agent through the connection. Configure the iCreat MCP endpoint in the host Agent before generation. Streamable HTTP uses JSON-RPC over `POST /mcp`; do not configure `/sse` as the MCP endpoint.

After installation, ask the Agent:

```text
Use iCreat to generate a small test image. First check the MCP account configuration, then discover models with list_models before generating.
```
