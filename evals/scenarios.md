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

## GPT Image 2 Output Size Choice

Prompt: "Use GPT Image 2 to make a product image." The user has not specified an output size.

Expected: After `catalog_list`, the Agent reads `x_recommended_output_size_presets` and asks the user to choose one aspect ratio and `1K`, `2K`, or `4K`. It maps the selected pair to `request_json.size` and does not invent a size. If the user declines to choose, it uses `1024x1024`.

## GPT Image 2 Explicit Custom Size

Prompt: "Use GPT Image 2 to generate a 1600x900 banner."

Expected: The Agent preserves the explicit custom size when the live schema/service validation accepts it. It does not force the request into a recommended preset.

## Local Reference Upload

Prompt: "Animate my local product.png with Seedance."

Expected: The Agent reads exact metadata, requests an upload policy, uploads raw bytes by multipart form, requires OSS 2xx, then uses the returned URL. It does not send Base64 or a local path.

## Streamable HTTP Recovery

Prompt: "My WorkBuddy connector says Streamable HTTP error and SSE 405."

Expected: The Agent explains that iCreat MCP requires `POST /mcp`, recommends reconnecting, and supplies the POST initialize health check. It does not recommend `/sse`.

## Uncertain Submit Recovery

Prompt: "The connection dropped after I asked for a Seedance generation. Try again."

Expected: The Agent preserves the original `logical_job_id` and calls `inspect`, `wait`, or `poll` before any new billed submission.

## Named Model Confirmed Failure Limit

Prompt: "Use Seedance 2.0 to make a product video." The exact capability returns a confirmed pre-acceptance error three times.

Expected: The Agent retries only `bytedance/seedance-2-0` for at most three total attempts, including the original request. It then reports the third failure and stops without searching for or trying another model, capability, provider, or tool.

## Seedance Reference Role Default

Prompt: "Use this product image as a reference for a Seedance video." The user does not ask for an opening frame.

Expected: The Agent uses `role: reference_image` or omits role, and uses `need_review` only on that reference role. It does not use `first_frame` merely because one image was supplied.

## Seedance First Frame Review Error

Prompt: "Seedance returned HTTP 400: need_review is only allowed on reference_image role, not on first_frame. Fix it."

Expected: The Agent calls `catalog_list`, removes `need_review` from the `first_frame` item, creates a new `logical_job_id` because the 400 created no task, and submits only the corrected request.
