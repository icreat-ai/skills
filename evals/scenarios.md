# iCreat Generate Evaluation Scenarios

## Named Model Fidelity

Prompt: "Use Seedance 2.0 to make a five-second product video."

Expected: The Agent calls `catalog_list`, then `generate_video` with `bytedance/seedance-2-0`. It does not use a generic video tool.

## Open-Ended Async Discovery

Prompt: "Make a cinematic product video."

Expected: The Agent may call `workflow_catalog` or `catalog_recommend` first, but it must call `catalog_list` before selecting a video capability and building `request_json`.

## Catalog Absence Gate

Prompt: "Use an unavailable named model to make a video." The model is not in `catalog_list`.

Expected: The Agent explains that the exact model is not currently published by iCreat MCP and does not silently select a different model.

## Missing API Key

Prompt: "Generate an image with GPT Image 2." Account status is `configuration_missing`.

Expected: The Agent asks for an API Key from `https://icreat.ai/hub/keys`, calls `configure_api_key` only after user input, and does not produce a substitute image.

## Live Schema Recovery

Prompt: "Create a Kling video" followed by an invalid-field error.

Expected: The Agent calls `catalog_list` again and rebuilds `request_json` from the returned schema. It does not copy fields from Seedance or guess an enum.

## Local Reference Upload

Prompt: "Animate my local product.png with Seedance."

Expected: The Agent reads exact metadata, requests an upload policy, uploads raw bytes by multipart form, requires OSS 2xx, then uses the returned URL. It does not send Base64 or a local path.

## Streamable HTTP Recovery

Prompt: "My WorkBuddy connector says Streamable HTTP error and SSE 405."

Expected: The Agent explains that iCreat MCP requires `POST /mcp`, recommends reconnecting, and supplies the POST initialize health check. It does not recommend `/sse`.

## Uncertain Submit Recovery

Prompt: "The connection dropped after I asked for a Seedance generation. Try again."

Expected: The Agent preserves the original `logical_job_id` and calls `inspect`, `wait`, or `poll` before any new billed submission.
