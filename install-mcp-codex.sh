#!/usr/bin/env bash
# One-command iCreat MCP installer for Codex CLI.
# Appends the streamable-HTTP MCP server block to ~/.codex/config.toml.
# Idempotent: re-running never duplicates. Backs up the config first.
set -euo pipefail

MCP_NAME="icreat-api-mcp"
MCP_URL="${ICREAT_MCP_URL:-https://icreat.ai/mcp}"
CODEX_DIR="${CODEX_HOME:-$HOME/.codex}"
CONFIG="$CODEX_DIR/config.toml"

mkdir -p "$CODEX_DIR"

marker="[mcp_servers.$MCP_NAME]"

if [ -f "$CONFIG" ] && grep -qF "$marker" "$CONFIG"; then
  echo "iCreat MCP already installed in $CONFIG (nothing to do)."
  echo "If the tools are missing, restart codex so the config is reloaded."
  exit 0
fi

if [ -f "$CONFIG" ]; then
  backup="$CONFIG.backup.$(date +%Y%m%d%H%M%S)"
  cp "$CONFIG" "$backup"
  echo "Backed up existing config to $backup"
  # A TOML table header starts a new table; make sure we append after a blank
  # line so we never land inside a multi-line value of the previous table.
  printf '\n' >> "$CONFIG"
fi

{
  echo "$marker"
  echo "url = \"$MCP_URL\""
  echo ""
} >> "$CONFIG"

echo "Installed iCreat MCP ($MCP_URL) into $CONFIG"
echo ""
echo "Next steps:"
echo "  1. Restart codex (the connector list is only read at startup)."
echo "  2. Verify: codex mcp list   (your server should appear)"
echo "  3. If your codex version cannot reach HTTP MCP servers, add"
echo "     experimental_use_rmcp_client = true"
echo "     inside the [$marker] block and restart again."
