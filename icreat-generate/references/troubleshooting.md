# iCreat MCP Troubleshooting

Use the exact error text in web searches together with `iCreat MCP`. Every iCreat MCP input or guard failure returns one structured envelope: `success:false`, a stable `error` code, a `message`, a `next_step` with the exact corrective action, and a `faq` reference. Read the code and `next_step`, then retry the SAME tool. For per-error real-case fixes, see [faq.md](./faq.md). Prefer the current MCP workflow over switching providers, spoofing headers, or generating a substitute asset.

## Error Code Quick Reference

| Error code | Meaning | Fix |
|---|---|---|
| `invalid_arguments` | A required argument is missing or wrong-typed (e.g. `generate_video` without `logical_job_id`) | Add the field named in `message`; use a stable `logical_job_id` for every generation |
| `size_bytes_not_number` | `size_bytes` was not repairable (`"12KB"`, `"12.5"`, `0`, negative) | Re-read the real file size in bytes; pure digit strings are auto-corrected, units/decimals are not |
| `request_json_invalid` | `request_json` was an array, scalar, invalid JSON, or (for `call`) missing `model` | Build it as an object exactly from the model's `get_model_api_doc` |
| `local_or_inline_media_detected` | A media field contained a local path, `file://`, `data:`, Base64, plain http, relative path, or private-IP URL | Call `upload_generation_reference`, upload to OSS yourself, then use the returned public https URL |
| `streaming_unsupported` | `request_json` set `stream: true` | Omit `stream` or set it to `false`; never call REST directly for SSE |
| `modality_mismatch` | Tool does not match the model's category (e.g. a VIDEO model on `generate_image`) | Use the matching `generate_*` tool or pick another model via `list_models` |
| `adapter_endpoint_mismatch` | LLM model and endpoint use different fixed adapters (e.g. Claude on the OpenAI path) | Use the endpoint documented in the model's `get_model_api_doc`; Claude family -> `/llm/anthropic/v1/messages`, others -> `/llm/openai/v1/chat/completions` |
| `unsupported_execution_protocol` | The model's official doc declares no protocol this MCP executes | Report the model as not executable; do not substitute silently |
| `hub_detail_unavailable` | Official website model directory temporarily unreachable | Retry shortly; do not guess parameters from memory |
| `api_key_not_configured` | No API Key available | Ask the user for a key from `https://icreat.ai/hub/keys`, then `configure_api_key` or pass `api_key` explicitly |
| `review_required` (via `face_review_rejected` hint) | Reference media containing a real face or copyrighted IP was submitted without review, or review rejected it | Ask the user about face/IP usage rights; if confirmed, resubmit ONCE with `need_review: true` and a NEW `logical_job_id`; never bypass with `false` |
| `cloudflare_access_denied` | Cloudflare 403/1010 blocked an official request | Never spoof Chrome/`sec-ch-ua` headers and never bypass MCP with your own HTTP client (this is what triggers 1010 for Python clients). Report it so the gateway can allow the official `icreat-mcp/*` User-Agent |

## Client-side schema errors (request never reached the server)

Real case (2026-09-11): a client framework serialized integers as strings and failed its own local check with `Parameter validation failed ... /size_bytes: must be integer`. The published schema declares `size_bytes` as `integer|string` and `request_json` as `object|string`, so the server auto-corrects a pure digit `size_bytes` and a serialized JSON-object `request_json` (reported via an `auto_corrected` note).

Fix: retry the SAME tool call unchanged. Do not spawn the MCP binary manually, switch transports, or call REST endpoints directly to dodge a local type error — that loses `logical_job_id` duplicate protection, task state, polling, and audit.

## The bypass trap

Two real sessions ended with an agent "helpfully" calling `presign` or `/v1/task/submit/*` directly while holding a working API Key. The task succeeded but could not be polled, inspected, or audited. Rule: even if you hold the API Key and know the REST endpoints, never bypass MCP tools. On failure, read `error` + `next_step` and retry the same tool.

## `streamableHttp connect failed` together with `SSE error: Non-200 status code (400)`

Real case (2026-09-11): after a long `wait` was cut by the gateway, the client retried Streamable HTTP and then fell back to standalone SSE. `GET /mcp` without an `Mcp-Session-Id` returns 400 by design (MCP spec), so both attempts failed and the client dropped every iCreat tool.

Fix: configure `POST https://<host>/mcp` only - iCreat MCP has no standalone SSE endpoint. `GET /mcp` is valid only with a session id from a prior POST `initialize`. The 400 body carries `invalid_sse_stream_request` with a `next_step`. If the drop happened during `wait`, resume polling (see the wait section above); never resubmit the task.

## `Streamable HTTP error` and `SSE error: Non-200 status code (405)`

iCreat MCP uses Streamable HTTP JSON-RPC over `POST /mcp`. Some clients fall back to legacy SSE after a failed Streamable HTTP attempt; `GET /mcp` is unsupported and correctly returns `405 Method Not Allowed`.

Recovery:

1. Configure `https://<host>/mcp`, not `/sse`.
2. Reconnect, trust, or disable and re-enable the MCP connector to force a new initialize request.
3. Verify the endpoint with:

```bash
curl -i -X POST https://<host>/mcp \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize"}'
```

4. A healthy endpoint returns HTTP 200 and an MCP initialize response. If it does not, the deployment owner should inspect the reverse proxy, TLS certificate, WAF, and MCP service logs.

## Invalid Parameter, Unsupported Field, or Invalid Enum

For a deterministic HTTP 400 parameter error, no task was created. Call `get_model_api_doc` again for the exact `user_model_code`, rebuild `request_json` from its current `api_doc`, then submit the corrected independent request with a new `logical_job_id`. Do not reuse fields from another model or stale documentation.

This is a confirmed pre-acceptance failure. Retry only the user-selected model or capability, count the original request in a maximum of three total attempts, and stop after the third confirmed failure. Do not search for, recommend, or invoke an alternative model, capability, provider, or tool unless the user explicitly requests one.

For GPT Image 2 output-size errors, read `x_recommended_output_size_presets` from the model's Detail when present, ask the user to choose an aspect ratio and `1K`, `2K`, or `4K`, then submit the matching mapped `request_json.size`. The preset metadata is guidance only; do not send it as a request field.

For Seedance error `need_review is only allowed on reference_image role, not on first_frame`, remove `need_review` from the `first_frame` item. `need_review` is valid only for `reference_image` and `reference_video` (and defaults to `true` there); it is invalid for `first_frame`, `last_frame`, `text`, and `audio_url`.

## Requested Model Is Not In `list_models`

The model is not currently published on the official website, or the directory is temporarily unavailable (`HUB_CATALOG_UNAVAILABLE`). Tell the user that the exact requested model cannot be submitted through iCreat MCP at this time. Do not silently change to a different model. For a broad request, present choices from `list_models` filtered by category or keyword.

## `SignatureDoesNotMatch` on the OSS upload

Real case (2026-09-23): an agent hand-assembled the upload command and mistyped two characters inside the `policy` field, so OSS rejected the signature. The signature fields are high-entropy (`policy` ~500 chars, `x-amz-signature` 64 chars) and cannot be reliably re-typed by a model.

Fix: run the official helper so the fields are passed programmatically and never re-typed:

```bash
node ./scripts/upload-reference.mjs --file /absolute/path/photo.png
```

If the helper itself reports `signature_mismatch`, stop and report it — that points at the presign service or clock skew, not transcription. When node is unavailable and you must hand-submit, write the policy JSON to a file and let the HTTP client read the fields from it.

## Upload Blocked: `getaddrinfo ENOTFOUND` / Sandboxed Client Network

Real case (2026-09-23, Codex): `upload_generation_reference` succeeded, but the POST of raw bytes to OSS failed with `getaddrinfo ENOTFOUND s3.ap-southeast-1.amazonaws.com`. Same machine, non-sandbox shell: `dig` resolves fine; inside the sandbox even `npx` fails with ENOTFOUND. Diagnosis: the client sandbox forbids ALL outbound network (DNS-level) - not an iCreat, OSS, or domain problem.

Remediation (in this order):

1. Ask the user to approve running the upload command **outside the sandbox** when the client prompts.
2. Or guide the user to enable sandbox outbound network in `~/.codex/config.toml` (`[sandbox_workspace_write] network_access = true`, then restart codex; lowers isolation - mention it).
3. Or finish the upload from a client with outbound network (e.g. WorkBuddy) and bring the official URL back.
4. Or ask the user for an already public https URL of the media.

**Never:** switch S3 region or CDN domain, use third-party image hosts, put Base64 into `request_json`, bypass MCP with direct REST, or generate a local substitute.

## Local Reference Upload Failed

Do not submit the generation request. Report the exact upload failure and ask for a public reference URL if raw bytes or multipart upload are unavailable. Do not use Base64, local paths, a guessed URL, or an unrelated asset.

## Uncertain Submission or Duplicate Risk

Keep the same `logical_job_id`. Use `inspect`, `wait`, or `poll` before a new submit. Do not create a new job ID just because a network response was interrupted.

## Task Failed

Report the returned task error. Preserve the `task_id` and `logical_job_id` for diagnostics. A failed task is not permission to claim success, generate a local fallback, or try another model unless the user explicitly requests an alternative.

## `wait` Dropped or "Connection closed" on HTTP Transport

Real case (2026-09-11): a `wait` with `timeout="10m"` held one HTTP request open with zero response bytes until the gateway cut it, and repeated retries exhausted the server's concurrency slots.

Fixed in MCP v0.3.1: on HTTP transport `wait` is capped at 50 seconds per call. If it returns a retryable `wait_timeout`, call `wait` again with the same `task_id` or `logical_job_id` and keep polling until `SUCCEEDED`. Never raise `timeout` above 60s over HTTP, and never resubmit a billed task because its `wait` dropped - the task keeps running server-side.

## `wait` Timeout, `NOT_FOUND`, or Missing Result Assets

Do not create a new task immediately. First use `inspect` with `logical_job_id`, then `poll` or `wait` with the original `task_id` when available. If the task remains terminal without assets, report the status and identifiers to the user. A completed task must be `SUCCEEDED` and contain result assets before it can be delivered.

## models list returns `"status":"stale"` (CLI `stale_cache`)

The remote `/v1/models` request failed and a cache older than 5 minutes was returned for diagnostics (`ok:false`, non-zero exit). Treat the list as outdated: retry, or prefer MCP `list_models` (official website directory) for discovery.
