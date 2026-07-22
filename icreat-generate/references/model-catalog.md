# iCreat MCP Model Catalog

Use this document for model selection and key constraints. Before a real generation call, invoke `catalog_list`; its `request_schema` and `request_example` are authoritative.

## Image

| Model | capability_code | Required field | Important constraints |
|---|---|---|---|
| GPT Image 2 | `openai/gpt-image-2` | `prompt` | Up to 16 `image` URLs; `size` supports `auto`, documented sizes, or documented `WIDTHxHEIGHT`; `quality` is `high`, `medium`, or `low` |
| Nano Banana 2 | `google/gemini-3-1-flash-image` | `prompt` | Up to 14 `image` URLs; supported `aspect_ratio`; `image_size` is `1K`, `2K`, or `4K` |
| Nano Banana Pro | `google/gemini-3-pro-image` | `prompt` | Same family as Nano Banana 2; up to 11 `image` URLs |
| Seedream 5 | `bytedance/seedream-5-0` | `prompt` | Up to 14 `image` URLs; `size` supports `2K`, `3K`, `4K`, or documented `WIDTHxHEIGHT`; `output_format` is `png` or `jpeg`; `watermark` is boolean |

Seedream conditional rule: include `sequential_image_generation_options` only when `sequential_image_generation` is `auto`. Its `max_images` range is 1 through 15.

## Seedance Video

| Model | capability_code | Required field | Resolution |
|---|---|---|---|
| Seedance 2.0 | `bytedance/seedance-2-0` | `content` with at least one non-empty text item | `480p`, `720p`, `1080p`, `4k` |
| Seedance 2.0 Fast | `bytedance/seedance-2-0-fast` | Same as Seedance 2.0 | `480p`, `720p` |
| Seedance 2.0 Mini | `bytedance/seedance-2-0-mini` | Same as Seedance Fast | `480p`, `720p` |

- `content` item types: `text`, `image_url`, `video_url`, `audio_url`.
- A `text` item requires non-empty `text`.
- Valid ratios: `16:9`, `4:3`, `1:1`, `3:4`, `9:16`, `21:9`, `adaptive`.
- `duration` is 4 through 15 seconds, or `-1` for automatic selection.
- Omit `role` unless the user gives explicit media semantics. Defaults are `image_url` -> `reference_image`, `video_url` -> `reference_video`, and `audio_url` -> `reference_audio`.
- Use `first_frame` only when the user explicitly wants an opening frame or asks to animate one image. Use `first_frame` and `last_frame` only when the user explicitly asks to transition from one image to another.
- `need_review` is allowed only on `reference_image` and `reference_video`, and defaults to `true` when omitted. Send `false` only after the user confirms there is no real human face. Never send it on `first_frame`, `last_frame`, `text`, or `audio_url`.

## Happy Horse Video

All requests use an outer `input` object and `parameters` object.

| Route | capability_code | Required input |
|---|---|---|
| Text to Video | `ali/happyhorse-1-1/text-to-video` | `input.prompt` |
| Image to Video | `ali/happyhorse-1-1/image-to-video` | Exactly one `input.media` item of type `first_frame` |
| Reference to Video | `ali/happyhorse-1-1/reference-to-video` | 1 to 9 `input.media` items of type `reference_image` |
| Video Edit | `ali/happyhorse-1-1/video-edit` | `input.prompt` and exactly one video media item; may also have reference images |

- Text, image, and reference routes support `resolution` `720P` or `1080P`, `duration` 3 through 15, optional `watermark`, and optional integer `seed`.
- Text and reference routes also support published ratios.
- Video Edit supports `audio_setting` of `auto` or `origin`.
- All media must use public remote URLs, not local paths or Base64 data.

## Kling Video

| Model | capability_code | Required fields |
|---|---|---|
| Kling Video O1 | `kuaishou/kling-video-o1` | Usually `prompt`; follow runtime conditional schema |
| Kling V3 Omni | `kuaishou/kling-v3-omni` | Usually `prompt`; follow runtime conditional schema |
| Kling Motion Control | `kuaishou/kling-v3/motion-control` | `image_url`, `video_url`, `character_orientation`, `mode` |

Kling conditions:

- If `multi_shot` is false or omitted, require `prompt`.
- If `multi_shot` is true, use `shot_type: intelligence` with `prompt`, or `shot_type: customize` with `multi_prompt` containing 1 to 6 items.
- If `video_list` is present, use `sound: off`.
- `image_list` items use `image_url` and may specify `first_frame` or `end_frame`.
- `mode` values are `std`, `pro`, `4k`; ratios are `16:9`, `9:16`, `1:1`.
- Motion Control `character_orientation` is `image` or `video`; its `mode` is `std` or `pro`.

## Audio and Utility

| Model | capability_code | Required field | Important constraints |
|---|---|---|---|
| Tencent Text to Speech | `tencent/text-to-speech` | `text` | `codec`: `mp3`, `wav`, `pcm`; `sample_rate`: 8000 or 16000; `speed`: -2 to 6; `volume`: -10 to 10 |
| Smart Erase Subtitle | `tencent/smart-erase-subtitle` | `video_url` | `mode`: `auto` or `custom`; custom mode requires `custom_areas`; supports OCR and subtitle embedding |

For Smart Erase custom areas, each item needs `begin_ms`, `end_ms`, and at least one area with rectangle coordinates and `unit` of `percent` or `pixel`.
