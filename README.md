# iCreat AI Agent Skills

Official AI agent skills for iCreat products. Connect Codex, Claude Code, Cursor, and other agents to iCreat MCP for image generation, video generation, video editing, and text-to-speech.

Keywords: iCreat MCP, iCreat API MCP server, AI agent skills, AI image generation, AI video generation, Seedance MCP, Kling MCP, Happy Horse MCP, GPT Image 2 MCP, Nano Banana MCP, Seedream MCP, text-to-speech MCP, Model Context Protocol.

## Install

Install all iCreat skills with the cross-agent installer:

```bash
npx skills add icreat-ai/skills
```

Other installation options are in [INSTALL.md](./INSTALL.md). If you are an AI agent installing this repository for a user, follow [INSTALL_FOR_AGENTS.md](./INSTALL_FOR_AGENTS.md).

## Skills

| Skill | Purpose |
|---|---|
| [`icreat-generate`](./icreat-generate) | Use iCreat MCP to generate images, videos, edited videos, and speech audio. Supports GPT Image 2, Nano Banana, Seedream, Seedance, Kling, Happy Horse, Tencent Text to Speech, and Smart Erase Subtitle. |

## Quick Start For Agents

1. Ensure the iCreat MCP connector is installed and trusted (iCreat MCP v0.3.0+).
2. Call `get_started`.
3. Discovery is dynamic: call `list_models` (optionally filtered by category or keyword) for currently published models, then `get_model_api_doc` for the exact `user_model_code` before building any request. The official website is always the source of truth.
4. Call `get_account_status` before a credentialed operation. If configuration is missing, ask the user for an API Key from `https://icreat.ai/hub/keys` and call `configure_api_key` only after they provide it.
5. If the generation needs a local image, video, or audio reference, call `upload_generation_reference`, upload raw bytes with the returned OSS multipart policy, and continue only after OSS returns 2xx. Do not use Base64, local paths, or guessed URLs.
6. Use `generate_image`, `generate_video`, or `generate_audio` with the exact `user_model_code` as `capability_code`, a stable `logical_job_id`, and a `request_json` built exactly from the model's `api_doc`.
7. Use `wait` or `poll`, and return assets only after the task reaches `SUCCEEDED`.

Every tool failure returns a structured envelope (`error` code, `next_step`, `faq`); follow `next_step` and retry the same tool. Never bypass MCP with direct REST calls, and never guess model fields, enum values, API Keys, upload metadata, or reference URLs.

## Supported Model Families

- Image: GPT Image 2, Nano Banana 2, Nano Banana Pro, Seedream 5
- Video: Seedance 2.0, Seedance 2.0 Fast, Seedance 2.0 Mini, MiniMax H3, Kling Video O1, Kling V3 Omni, Kling Motion Control, Happy Horse
- Audio: Tencent Text to Speech
- Video utility: Smart Erase Subtitle

New models published on the official website are usable immediately through `list_models` / `get_model_api_doc` without a Skill update; this list is a hint only.

See the Skill's [model catalog](./icreat-generate/references/model-catalog.md) and [troubleshooting guide](./icreat-generate/references/troubleshooting.md) for Agent-readable details.

## Compatibility

- Codex, Claude Code, and Cursor: supported by `npx skills add` and the included plugin metadata.
- WorkBuddy and other agents: import `icreat-generate/SKILL.md` using the product's documented Skill mechanism, or use `./setup --host workbuddy` with `WORKBUDDY_SKILLS_DIR` set to its Skill directory.

## License

Add your organization's selected license before publishing this repository.
