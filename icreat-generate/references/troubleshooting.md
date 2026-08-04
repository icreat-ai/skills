# iCreat MCP Troubleshooting

Use the exact error text in web searches together with `iCreat MCP`. Prefer the current MCP connection and schema workflow over switching providers or generating a substitute asset.

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

Search queries:

```text
iCreat MCP Streamable HTTP error
iCreat MCP SSE error Non-200 status code 405
WorkBuddy iCreat MCP reconnect
Codex iCreat MCP POST /mcp initialize
```

## `configuration_missing`

The API Key is absent for this `client_id`. Ask the user for an API Key from `https://icreat.ai/hub/keys`, then call `configure_api_key`. Do not invent a key or silently route to another provider.

## Invalid Parameter, Unsupported Field, or Invalid Enum

For a deterministic HTTP 400 parameter error, no task was created. Call `catalog_list` again, re-select the exact `capability_code`, rebuild `request_json` from the current `request_schema` and `request_example`, then submit the corrected independent request with a new `logical_job_id`. Do not reuse fields from another model or stale documentation.

This is a confirmed pre-acceptance failure. Retry only the user-selected model or capability, count the original request in a maximum of three total attempts, and stop after the third confirmed failure. Do not search for, recommend, or invoke an alternative model, capability, provider, or tool unless the user explicitly requests one.

For GPT Image 2 output-size errors, read the live `x_recommended_output_size_presets`, ask the user to choose an aspect ratio and `1K`, `2K`, or `4K`, then submit the matching mapped `request_json.size`. The preset metadata is guidance only; do not send it as a request field. A user who explicitly requests a custom `WIDTHxHEIGHT` may use it when the live service accepts it.

For Seedance error `need_review is only allowed on reference_image role, not on first_frame`, remove `need_review` from the `first_frame` item. `need_review` is valid only for `reference_image` and `reference_video`; it is invalid for `first_frame`, `last_frame`, `text`, and `audio_url`. Use `reference_image` by default unless the user explicitly asks for an opening frame or image animation.

## Requested Model Is Not In `catalog_list`

The model is not currently published by iCreat MCP, or the catalog is unavailable. Tell the user that the exact requested model cannot be submitted through iCreat MCP at this time. Do not silently change to a different model. For a broad request without a named model, call `catalog_recommend` and present the iCreat-supported choice.

## Local Reference Upload Failed

Do not submit the generation request. Report the exact upload failure and ask for a public reference URL if raw bytes or multipart upload are unavailable. Do not use Base64, local paths, a guessed URL, or an unrelated asset.

## Uncertain Submission or Duplicate Risk

Keep the same `logical_job_id`. Use `inspect`, `wait`, or `poll` before a new submit. Do not create a new job ID just because a network response was interrupted.

## Task Failed

Report the returned task error. Preserve the `task_id` and `logical_job_id` for diagnostics. A failed task is not permission to claim success, generate a local fallback, or try another model unless the user explicitly requests an alternative.

## `wait` Timeout, `NOT_FOUND`, or Missing Result Assets

Do not create a new task immediately. First use `inspect` with `logical_job_id`, then `poll` or `wait` with the original `task_id` when available. If the task remains terminal without assets, report the status and identifiers to the user. A completed task must be `SUCCEEDED` and contain result assets before it can be delivered.
