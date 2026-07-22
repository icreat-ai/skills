# iCreat MCP Request Examples

These are minimal shapes for planning. Use the MCP protocol in this order: `get_started` -> discovery -> `get_account_status` -> optional upload -> submission -> `wait`. Call `catalog_list` first and adapt every `request_json` to the current live schema.

## Required Preflight

Use one stable `client_id` throughout a workflow:

```json
{"client_id":"workspace-user"}
```

1. New session: call `get_started`.
2. Named model or async generation: call `catalog_list` and select the exact capability entry.
3. Before submit, poll, or wait: call `get_account_status` with the same `client_id`.
4. If status is `configuration_missing`, stop. Ask the user for an API Key from `https://icreat.ai/hub/keys`, then call `configure_api_key` after they provide it.

## GPT Image 2

Tool: `generate_image`

```json
{
  "client_id": "workspace-user",
  "capability_code": "openai/gpt-image-2",
  "logical_job_id": "hero-image-01",
  "request_json": {
    "prompt": "A premium sneaker product hero on a clean studio background",
    "size": "1024x1024",
    "quality": "high"
  }
}
```

## Seedance 2.0

Tool: `generate_video`

```json
{
  "client_id": "workspace-user",
  "capability_code": "bytedance/seedance-2-0",
  "logical_job_id": "launch-video-01",
  "request_json": {
    "content": [
      {"type": "text", "text": "A cinematic product reveal at sunset, slow camera orbit"}
    ],
    "ratio": "16:9",
    "duration": 5
  }
}
```

## Seedance With An Image Reference

Tool: `generate_video`

```json
{
  "client_id": "workspace-user",
  "capability_code": "bytedance/seedance-2-0",
  "logical_job_id": "reference-video-01",
  "request_json": {
    "content": [
      {"type": "text", "text": "Animate this product with a slow dolly-in"},
      {
        "type": "image_url",
        "image_url": {"url": "https://public.example.com/product.png"},
        "role": "first_frame",
        "need_review": true
      }
    ],
    "ratio": "9:16",
    "duration": 5
  }
}
```

Use `need_review: false` only when the user confirms there is no real human face in the image or video reference.

## Text to Speech

Tool: `generate_audio`

```json
{
  "client_id": "workspace-user",
  "capability_code": "tencent/text-to-speech",
  "logical_job_id": "voiceover-01",
  "request_json": {
    "text": "Welcome to our new product launch.",
    "codec": "mp3"
  }
}
```

## Wait For Completion

Tool: `wait`

```json
{
  "client_id": "workspace-user",
  "logical_job_id": "launch-video-01",
  "timeout": "10m"
}
```

Use the returned task result only after status is `SUCCEEDED`.
