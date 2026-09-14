# iCreat MCP Agent FAQ

> This file is the `faq` target referenced by every structured error envelope (`ICREAT_AGENT_FAQ.md#<error_code>`). Read it when any iCreat MCP tool call fails. Every entry is keyed by the exact error code or symptom you saw. Follow the Fix steps with the SAME tool. Everything marked **Never** is a hard rule: violations have caused duplicated billed tasks, leaked uploads, and broken traces in real sessions.

## How errors reach you

Every input or guard failure returns one envelope:

```json
{
  "success": false,
  "error": "stable_error_code",
  "message": "what went wrong",
  "next_step": "the exact corrective action",
  "faq": "ICREAT_AGENT_FAQ.md#stable_error_code"
}
```

Read `error` + `next_step`, apply the fix, retry the same tool. Some codes also carry `expected_format` and `example` (e.g. `size_bytes_not_number`, `request_json_invalid`). If a code is missing here, follow `next_step` alone.

---

## client-side validation errors (request never reached the server)

### `Parameter validation failed ... /size_bytes: must be integer` (from your own client, e.g. WorkBuddy DeferExecuteTool)

**What happened (real case, 2026-09-11):** some client frameworks serialize integers as strings before calling MCP tools, then fail their own local schema check. The request never reached the iCreat MCP server — the server would have auto-corrected it.

**Fix:**

1. Retry the SAME tool call unchanged. The published schema declares `size_bytes` as `integer|string`, so the local check passes and the server repairs `"4127155"` → `4127155` (response carries an `auto_corrected` note).
2. If your framework still rejects locally, send the value as a true JSON number in raw JSON-RPC to the same MCP server.

**Never:** spawn the MCP binary manually, switch to direct REST, or call the platform presign/submit endpoints yourself just to dodge a local type error. That breaks audit state, duplicate protection (`logical_job_id`), and result polling.

### Client-side rejection of `request_json` as an object

Same class of bug: the framework serializes the object to a string and fails its local check. The schema declares `request_json` as `object|string`; a serialized JSON **object** string is auto-corrected server-side. Arrays, scalars, and invalid JSON are still rejected. Retry the same call.

---

## `local_or_inline_media_detected`

**What happened (real case):** the agent passed `/Users/x/photo.png`, `data:image/png;base64,...`, `http://...`, a relative path, or a private-IP URL inside a media field of `request_json`.

**Fix:**

1. Read the real file's `filename`, exact MIME `content_type`, and raw byte `size_bytes` (JSON number).
2. Call `upload_generation_reference`.
3. POST the raw bytes yourself to the returned `upload_url`: every `form_fields` entry first, `file` last, NO `Authorization`/`Cookie`/API Key header.
4. Only after OSS returns 2xx, put the returned public **https** URL into the media field and retry the generation tool.

**Never:** retry generation with the local path still in place, use a third-party image host, or submit a billed task "to see if it works" after an upload failure.

## `review_required` (submit HTTP 400 or task FAILED - reference needs official review)

**What happened:** per the official Seedance `need_review` contract, reference media containing a **real human face or copyrighted IP** must be submitted with `need_review: true`. The request failed because review was skipped and upstream detected reviewable content, or a created task failed after review. Two shapes:

1. **Submit returned HTTP 400 mentioning face/review/copyright** - no task was created, nothing was billed.
2. **`wait`/`poll` returned `FAILED` with a review-related `error_code`** - media that needed review but was submitted without it very likely fails as a task.

**Fix (both shapes):**

1. Ask the user whether the reference contains a real human face or copyrighted IP content, and whether they have the right to use it.
2. If confirmed: resubmit **once** with `need_review: true` on the `reference_image`/`reference_video` items and a **NEW `logical_job_id`**. This recovers both shapes.
3. If it fails again with review enabled, offer a different reference image and stop after that.
4. If the user cannot confirm rights, stop and suggest media without identifiable faces or IP.

**Never:** set `need_review: false` to bypass review, resubmit identical media in a loop, silently swap the reference, or attach `need_review` to `first_frame`/`last_frame`/`text`/`audio_url` (HTTP 400 by contract).

## Related: review latency while waiting

`need_review: true` (the default for image/video references on Seedance-family models) adds an upstream review round-trip. A task with reviewed references can stay `SUBMITTED`/`IN_PROGRESS` noticeably longer than a text-only task. Keep calling `wait` with the same identifiers; do not resubmit because polling feels slow.

## `cloudflare_access_denied` (HTTP 403 / Cloudflare 1010)

**What happened (real case):** the official website or upload-policy route blocked the request at the edge.

**Fix:**

1. Do NOT add fake `Chrome` User-Agents, `sec-ch-ua`, or `Referer` headers.
2. Do NOT bypass MCP and call the website API from your own HTTP client — that is exactly what triggered 1010 for a Python client in the real case.
3. Retry once after a short wait.
4. If it persists, report the exact error and the official User-Agent `icreat-mcp/<version>` to the service owner; the gateway must allow `icreat-mcp/*` on `/hub/third/api/nexus/model-display/list`, `/hub/third/api/nexus/model-display/detail`, and `/api/uploads/presign`.

## `size_bytes_not_number`

You sent `size_bytes` that is not repairable: `"12KB"`, `"12.5"`, `"1e6"`, `0`, `-5`, or a boolean. Re-read the real file size in bytes and send `4127155`-style JSON numbers (digit strings are auto-corrected).

## `request_json_invalid`

`request_json` was an array, a scalar, invalid JSON, or (for `call`) missing `model`. Build it as an object exactly from the model's `get_model_api_doc` `api_doc` and retry.

## `invalid_arguments` (missing required fields)

**Real case:** `generate_video` without `logical_job_id`.

**Fix:** add the missing field named in `message`. For generation always include a stable `logical_job_id` (e.g. `seedance-img2video-001`); keep it identical across retries of the same intent so duplicate submissions are blocked.

## `modality_mismatch`

The tool does not match the model's official category (e.g. `bytedance/seedance-2-5` is VIDEO, so `generate_image` fails). Use the matching `generate_image` / `generate_video` / `generate_audio` tool, or pick another model via `list_models`. Do not force the model through the wrong tool.

## `adapter_endpoint_mismatch`

For `call`: the model's fixed adapter does not match the endpoint (e.g. a Claude-family model on `/llm/openai/v1/chat/completions`). Use the endpoint the model's `get_model_api_doc` documents — Claude family goes to `/llm/anthropic/v1/messages`, other LLMs to `/llm/openai/v1/chat/completions`.

## `unsupported_execution_protocol`

The model's official `api_doc` does not declare a protocol this MCP can execute. Report the model as not executable. Do not silently substitute another model.

## `hub_detail_unavailable`

The official website model directory is temporarily unreachable. Retry the same call after a short wait. Do not guess parameters from memory or skip validation.

## `streaming_unsupported`

`request_json` set `stream: true`. Omit `stream` or set it to `false`. Never call the platform REST API directly to get SSE.

## `api_key_not_configured`

No API Key is available. Ask the user for their key from `https://icreat.ai/hub/keys`, then call `configure_api_key` (single-user trusted client) or pass `api_key` explicitly on each credentialed call. Never invent a key.

## models list returns `"status":"stale"` (`stale_cache`)

The remote `/v1/models` request failed and a cache older than 5 minutes was returned for diagnostics (`ok:false`, non-zero exit). Treat the list as outdated: retry, or use MCP `list_models` (official website directory) instead of CLI `models list`.

---

## The bypass trap (read this before "working around" anything)

Two real sessions ended with the agent holding a working API Key and "helpfully" calling `https://100aidesign.com/api/uploads/presign` or `https://api.icreat.ai/v1/task/submit/...` directly. The task succeeded, but:

- the submit bypassed `logical_job_id` duplicate protection;
- no local job state existed, so `poll`/`wait`/`inspect` could not recover the task;
- the audit trail was lost.

**Rule:** even if you hold the API Key and know the REST endpoints, never bypass MCP tools. On failure, read `error` + `next_step` and retry the same tool. If the MCP itself is broken, report it — do not switch transports or protocols on your own.
