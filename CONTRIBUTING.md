# Contributing

Each iCreat Skill is a top-level directory containing `SKILL.md`. Optional detailed documents belong in that Skill's `references/` directory.

## Skill Rules

1. The `name` in YAML frontmatter must equal the Skill directory name.
2. Keep `SKILL.md` focused on routing, mandatory safety rules, and the next action. Put detailed model parameters and long examples in `references/`.
3. Every referenced file must exist within the same Skill directory. Do not use parent-directory references.
4. Runtime MCP discovery is authoritative. Do not document guessed or unpublished capability codes, request fields, or enums.
5. If a model route, tool name, or error-recovery rule changes, update both the Skill and affected reference document.
6. Keep `VERSION` and all plugin manifest versions synchronized for releases.

## Before Publishing

```bash
bash -n setup
test -f icreat-generate/SKILL.md
```

Review every example against the current iCreat MCP tool definitions and the official-website discovery responses (`list_models` / `get_model_api_doc`).
