# Install iCreat Skills For An AI Agent

The user asked you to install iCreat AI Agent Skills. Follow these steps.

1. Install the Skill bundle:

```bash
npx skills add icreat-ai/skills
```

2. If the command is unavailable, clone the repository and run the setup script for the current host:

```bash
git clone https://github.com/icreat-ai/skills.git
cd skills
./setup --host codex
```

3. Ensure the user has configured the iCreat MCP connector. The HTTP endpoint is `https://<host>/mcp` and uses Streamable HTTP JSON-RPC over POST.

4. Verify the installation by following the `icreat-generate` Skill: call `get_started`, then `get_account_status`. If configuration is missing, ask the user to obtain an API Key from `https://icreat.ai/hub/keys` and wait for them to provide it.

5. Do not expose local Skill paths, raw API Keys, or internal state in the final user response. Confirm installation and offer a short test generation prompt.
