# iCreat MCP Request Examples

These are minimal shapes for planning. Use the MCP protocol in this order: `get_started` -> discovery -> `get_account_status` -> optional upload -> submission -> `wait`. Call `list_models` to discover models and `get_model_api_doc` for the selected `user_model_code`; adapt every `request_json` to that model's current `api_doc`.

## Required Preflight

Use one stable `client_id` throughout a workflow:

```json
{"client_id":"workspace-user"}
```

1. New session: call `get_started`.
2. Named model or async generation: call `list_models` (optionally filtered by category/keyword), then `get_model_api_doc` with the exact `user_model_code`.
3. Before submit, poll, or wait: call `get_account_status` with the same `client_id`.
4. If status is `configuration_missing`, stop. Ask the user for an API Key from `https://icreat.ai/hub/keys`, then call `configure_api_key` after they provide it.

## GPT Image 2

Tool: `generate_image`

Before submitting GPT Image 2, ask the user for an aspect ratio and a resolution from `x_recommended_output_size_presets` in the model's Detail output (when present), unless they explicitly request default output or a custom size. For example, `9:16` + `2K` maps to `1440x2560`.

```json
{
  "client_id": "workspace-user",
  "capability_code": "openai/gpt-image-2",
  "logical_job_id": "hero-image-01",
  "request_json": {
    "prompt": "A premium sneaker product hero on a clean studio background",
    "size": "1440x2560",
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
        "role": "reference_image",
        "need_review": true
      }
    ],
    "ratio": "9:16",
    "duration": 5
  }
}
```

Use `need_review: false` only when the user confirms there is no real human face in a `reference_image` or `reference_video`. Do not include `need_review` for `first_frame`, `last_frame`, `text`, or `audio_url`.

## Seedance Animate an Explicit First Frame

Use this only when the user explicitly asks to animate the supplied image or use it as the opening frame.

```json
{
  "client_id": "workspace-user",
  "capability_code": "bytedance/seedance-2-0",
  "logical_job_id": "animate-first-frame-01",
  "request_json": {
    "content": [
      {"type": "text", "text": "Animate this image with a slow dolly-in"},
      {
        "type": "image_url",
        "image_url": {"url": "https://public.example.com/product.png"},
        "role": "first_frame"
      }
    ],
    "duration": 5
  }
}
```

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
