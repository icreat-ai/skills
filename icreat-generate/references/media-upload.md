# Local Reference Media Upload

Use this procedure only when a selected iCreat generation capability needs a local image, video, or audio file as a remote reference.

## Preferred Procedure: official upload helper (no signature transcription)

If `node` is available, use the bundled helper instead of hand-submitting the policy:

```bash
node ./scripts/upload-reference.mjs --file /absolute/path/photo.png
```

The helper fetches its own policy, submits every signature field programmatically, verifies HTTP 2xx, and prints one JSON object with `status` = `ready` | `failed` | `unknown`:

- `ready` - use the returned `url` in the generation request
- `failed` - act on `error_code`; never fabricate a URL
- `unknown` - outcome undetermined; do NOT generate and do NOT re-upload blindly

`file_sha256` is a local digest only; it does not prove remote object integrity. The helper is the only component allowed to call the fixed public presign endpoint and the allowlisted OSS host directly.

## Fallback Procedure (only when node is unavailable)

1. Read the actual local filename, exact MIME type, and raw byte size.
2. Confirm the Agent can read raw bytes and perform an external multipart form upload.
3. Call `upload_generation_reference` with `client_id`, `filename`, `content_type`, and `size_bytes`. Prefer a JSON number for `size_bytes`; a pure digit string like `"4127155"` is auto-corrected server-side (values with units, decimals, or non-positive values are rejected).
4. Send every returned `form_fields` value unchanged to the returned `upload_url`.
5. Add the raw attachment bytes as the final multipart field named `file`.
6. Do not attach an iCreat API Key, `Authorization` header, cookies, Base64 data, or JSON media payload to the OSS upload.
7. Require an OSS 2xx response before using the returned URL in `request_json`.

## If Upload Is Not Possible

If the Agent cannot access raw bytes, cannot send multipart requests, cannot determine metadata, or the upload fails, stop and report the blocker. Ask the user for an already public remote URL.

Do not use a local path, `file://` URL, Base64 content, guessed URL, unrelated third-party host, placeholder asset, or a billed retry to bypass the upload failure. When hand-submitting, pass signature fields programmatically (write the policy JSON to a file and let the HTTP client read it) - re-typing `policy` or `x-amz-signature` corrupts the signature and produces SignatureDoesNotMatch.
