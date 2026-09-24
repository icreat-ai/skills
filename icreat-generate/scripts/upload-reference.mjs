#!/usr/bin/env node
/**
 * iCreat official upload helper (Phase A).
 *
 * Purpose: upload one local reference file to the official iCreat OSS without
 * ever exposing the presign signature fields to a language model. The signature
 * is fetched, held in memory, and submitted by this program only.
 *
 * Usage:
 *   node upload-reference.mjs --file <absolute path to image/video/audio>
 *
 * Output: a single JSON object on stdout with status "ready" | "failed" | "unknown".
 *   ready   -> upload confirmed (HTTP 2xx); url is safe to use for generation
 *   failed  -> upload confirmed to have failed; error_code explains why
 *   unknown -> outcome undetermined (timeout / no response). Do NOT start
 *              generation and do NOT blindly re-upload.
 *
 * Scope note: this helper is the only component allowed to call the fixed public
 * presign endpoint directly, plus the OSS host that endpoint returns (checked
 * against an allowlist). Agents must never call billing APIs (/v1/task/*,
 * /llm/*) directly - those always go through MCP tools.
 */

import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { basename, extname } from 'node:path'

const PRESIGN_URL = process.env.ICREAT_PRESIGN_URL || 'https://100aidesign.com/api/uploads/presign'
const USER_AGENT = 'icreat-upload-helper/1.0 (+https://icreat.ai)'
const PRESIGN_TIMEOUT_MS = 30_000
const UPLOAD_TIMEOUT_MS = 300_000
const MAX_POLICY_RETRIES = 2 // only for confirmed policy expiry
const MAX_SIZE_BYTES = 65 * 1024 * 1024

// Extension allowlist. The presign backend does not restrict extensions, and S3
// does not inspect magic bytes, so this helper is the only gate.
const ALLOWED = new Map([
  ['png', { mime: 'image/png', magic: [[0x89, 0x50, 0x4e, 0x47]] }],
  ['jpg', { mime: 'image/jpeg', magic: [[0xff, 0xd8, 0xff]] }],
  ['jpeg', { mime: 'image/jpeg', magic: [[0xff, 0xd8, 0xff]] }],
  ['webp', { mime: 'image/webp', magic: [[0x52, 0x49, 0x46, 0x46]] }],
  ['mp4', { mime: 'video/mp4', magic: null }], // ftyp box checked separately
  ['mov', { mime: 'video/quicktime', magic: null }],
  ['mp3', { mime: 'audio/mpeg', magic: [[0x49, 0x44, 0x33], [0xff, 0xfb], [0xff, 0xf3], [0xff, 0xf2]] }],
  ['wav', { mime: 'audio/wav', magic: [[0x52, 0x49, 0x46, 0x46]] }],
])

// OSS hosts this helper may POST bytes to (suffix match on hostname).
const ALLOWED_UPLOAD_HOST_SUFFIXES = [
  '.amazonaws.com',
  '.icreat.ai',
  'icreat.ai',
]

function out(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
}

/**
 * Flattens an error and its cause chain into one string. Node's fetch reports
 * transport problems as a bare "fetch failed" and keeps the real code/reason on
 * err.cause, so classification must walk the chain.
 */
function describeError(err) {
  const parts = []
  let current = err
  let depth = 0
  while (current && depth < 5) {
    if (current.code) parts.push(String(current.code))
    if (current.reason) parts.push(String(current.reason))
    if (current.message) parts.push(String(current.message))
    current = current.cause
    depth += 1
  }
  return parts.join(' | ') || String(err)
}

function fail(errorCode, message, extra = {}) {
  out({ status: 'failed', error_code: errorCode, message, ...extra })
  process.exit(1)
}

function unknown(message, extra = {}) {
  out({
    status: 'unknown',
    message: `${message} The object may or may not exist on OSS. Do NOT start generation and do NOT re-upload blindly; ask the user to verify or retry later.`,
    ...extra,
  })
  process.exit(2)
}

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--file') {
      args.file = argv[i + 1]
      i += 1
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      args.help = true
    }
  }
  return args
}

function matchesMagic(buffer, spec, ext) {
  if (ext === 'mp4' || ext === 'mov') {
    // ISO base media: bytes 4..8 must be "ftyp"
    return buffer.length > 12 && buffer.subarray(4, 8).toString('latin1') === 'ftyp'
  }
  if (!spec.magic) return true
  return spec.magic.some((sig) => sig.every((byte, index) => buffer[index] === byte))
}

function hostAllowed(urlString) {
  let host
  try {
    const parsed = new URL(urlString)
    if (parsed.protocol !== 'https:') return false
    host = parsed.hostname.toLowerCase()
  } catch {
    return false
  }
  return ALLOWED_UPLOAD_HOST_SUFFIXES.some((suffix) =>
    suffix.startsWith('.') ? host.endsWith(suffix) : host === suffix,
  )
}

async function requestPolicy(ext, mime, sizeBytes) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PRESIGN_TIMEOUT_MS)
  try {
    const res = await fetch(PRESIGN_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'user-agent': USER_AGENT,
      },
      body: JSON.stringify({ file_extension: ext, content_type: mime, size_bytes: sizeBytes }),
      signal: controller.signal,
    })
    const text = await res.text()
    if (!res.ok) {
      return { error: `presign_http_${res.status}`, message: `presign returned HTTP ${res.status}: ${text.slice(0, 300)}` }
    }
    let body
    try {
      body = JSON.parse(text)
    } catch {
      return { error: 'presign_invalid_json', message: `presign response is not JSON: ${text.slice(0, 200)}` }
    }
    const policy = body?.result
    if (!policy?.url || !policy?.fields) {
      return { error: 'presign_incomplete', message: `presign response missing url/fields: ${text.slice(0, 200)}` }
    }
    return { policy }
  } catch (err) {
    if (err?.name === 'AbortError') {
      return { error: 'presign_timeout', message: `presign request timed out after ${PRESIGN_TIMEOUT_MS}ms` }
    }
    return { error: 'presign_network_error', message: `presign request failed: ${err?.message || err}` }
  } finally {
    clearTimeout(timer)
  }
}

function classifyUploadFailure(status, bodyText) {
  const lower = (bodyText || '').toLowerCase()
  if (status === 403 && (lower.includes('expired') || lower.includes('policy expired'))) {
    return { code: 'policy_expired', retryable: true }
  }
  if (lower.includes('signaturedoesnotmatch')) {
    return {
      code: 'signature_mismatch',
      retryable: false,
      hint: 'The submitted signature did not match. This helper never re-types the signature, so investigate the presign service or clock skew rather than agent transcription.',
    }
  }
  if (lower.includes('entitytoolarge') || status === 413) {
    return { code: 'file_too_large', retryable: false }
  }
  if (status === 403) return { code: 'upload_forbidden', retryable: false }
  return { code: `upload_http_${status}`, retryable: false }
}

/**
 * The presign service returns a virtual-hosted-style S3 URL. When the bucket
 * name contains dots (ours does: upload-s3.icreat.ai), the AWS wildcard
 * certificate *.s3.<region>.amazonaws.com cannot match the extra label, so TLS
 * verification fails. Converting to path-style keeps the same signature valid
 * (SigV4 POST policies are host-agnostic) and presents a certificate-valid host.
 * Verified 2026-09-24: virtual-hosted => TLS error, path-style => HTTP 204.
 */
function pathStyleCandidate(uploadURL) {
  const match = /^https:\/\/(?<bucket>.+)\.s3\.(?<region>[a-z0-9-]+)\.amazonaws\.com\/?$/.exec(uploadURL)
  if (!match?.groups) return null
  const { bucket, region } = match.groups
  if (!bucket.includes('.')) return null // single-label bucket: cert already matches
  return `https://s3.${region}.amazonaws.com/${bucket}`
}

function buildForm(policy, fileBuffer, filename, mime) {
  const form = new FormData()
  for (const [key, value] of Object.entries(policy.fields)) {
    form.append(key, String(value))
  }
  form.append('file', new Blob([fileBuffer], { type: mime }), filename)
  return form
}

async function postForm(targetURL, policy, fileBuffer, filename, mime) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS)
  try {
    const res = await fetch(targetURL, {
      method: 'POST',
      body: buildForm(policy, fileBuffer, filename, mime),
      headers: { 'user-agent': USER_AGENT },
      signal: controller.signal,
    })
    const bodyText = await res.text().catch(() => '')
    return { httpStatus: res.status, ok: res.status >= 200 && res.status < 300, bodyText }
  } catch (err) {
    if (err?.name === 'AbortError') {
      return { indeterminate: `upload timed out after ${UPLOAD_TIMEOUT_MS}ms.` }
    }
    // Node wraps transport failures as a generic "fetch failed"; the actionable
    // code/reason lives on the cause chain, so inspect the whole chain.
    const detail = describeError(err)
    // DNS / connection / TLS failures happen before any bytes are accepted:
    // confirmed transport failures, not indeterminate outcomes.
    if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|getaddrinfo|dns/i.test(detail)) {
      return { transportError: { code: 'upload_network_unreachable', message: `could not reach the OSS host ${targetURL}: ${detail}` } }
    }
    if (/ERR_TLS|CERT_|certificate|altname|SSL/i.test(detail)) {
      return { transportError: { code: 'upload_tls_error', message: `TLS verification failed for ${targetURL}: ${detail}` } }
    }
    return { indeterminate: `upload connection error: ${detail}.` }
  } finally {
    clearTimeout(timer)
  }
}

async function uploadOnce(policy, fileBuffer, filename, mime) {
  if (!hostAllowed(policy.url)) {
    return { fatal: { code: 'upload_host_not_allowed', message: `presign returned a non-allowlisted upload host: ${policy.url}` } }
  }

  const candidates = [policy.url]
  const pathStyle = pathStyleCandidate(policy.url)
  if (pathStyle && hostAllowed(pathStyle)) candidates.push(pathStyle)

  let lastTransportError = null
  for (const target of candidates) {
    const result = await postForm(target, policy, fileBuffer, filename, mime)
    if (result.transportError) {
      // Transport-level failure (DNS/TLS): try the next host form, if any.
      lastTransportError = result.transportError
      continue
    }
    return { ...result, uploadHost: target }
  }
  return { fatal: lastTransportError }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || !args.file) {
    out({
      status: 'failed',
      error_code: 'invalid_arguments',
      message: 'Usage: node upload-reference.mjs --file <absolute path to the media file>',
      runtime: process.version,
    })
    process.exit(1)
  }

  let info
  try {
    info = await stat(args.file)
  } catch (err) {
    fail('file_not_readable', `cannot stat ${args.file}: ${err?.message || err}`, { runtime: process.version })
  }
  if (!info.isFile()) fail('file_not_readable', `${args.file} is not a regular file`)
  if (info.size <= 0) fail('file_empty', `${args.file} is empty`)
  if (info.size > MAX_SIZE_BYTES) {
    fail('file_too_large', `file is ${info.size} bytes; the official limit is ${MAX_SIZE_BYTES} bytes`)
  }

  const ext = extname(args.file).replace('.', '').toLowerCase()
  const spec = ALLOWED.get(ext)
  if (!spec) {
    fail('unsupported_extension', `extension "${ext}" is not supported. Allowed: ${[...ALLOWED.keys()].join(', ')}`)
  }

  const fileBuffer = await readFile(args.file)
  if (!matchesMagic(fileBuffer, spec, ext)) {
    fail('content_type_mismatch', `file content does not match the ${ext} format (magic bytes check failed); rename or convert the file instead of forcing the extension`)
  }

  const fileSha256 = createHash('sha256').update(fileBuffer).digest('hex')
  const filename = basename(args.file)

  let attempt = 0
  let policyRetries = 0
  while (true) {
    attempt += 1
    const { policy, error, message } = await requestPolicy(ext, spec.mime, info.size)
    if (error) fail(error, message, { runtime: process.version, file_sha256: fileSha256, size_bytes: info.size })

    const result = await uploadOnce(policy, fileBuffer, filename, spec.mime)

    if (result.fatal) {
      fail(result.fatal.code, result.fatal.message, {
        runtime: process.version,
        file_sha256: fileSha256,
        size_bytes: info.size,
      })
    }
    if (result.indeterminate) {
      unknown(result.indeterminate, {
        runtime: process.version,
        object_key: policy.object_key,
        file_sha256: fileSha256,
        size_bytes: info.size,
      })
    }
    if (result.ok) {
      out({
        status: 'ready',
        http_status: result.httpStatus,
        url: policy.public_url,
        object_key: policy.object_key,
        // Local digest only. This does NOT prove remote object integrity: no
        // remote verification is performed.
        file_sha256: fileSha256,
        size_bytes: info.size,
        upload_host: result.uploadHost,
        runtime: process.version,
        attempts: attempt,
      })
      process.exit(0)
    }

    const classified = classifyUploadFailure(result.httpStatus, result.bodyText)
    if (classified.retryable && policyRetries < MAX_POLICY_RETRIES) {
      policyRetries += 1
      continue // re-sign with a fresh policy and upload again
    }
    fail(classified.code, `upload failed with HTTP ${result.httpStatus}${classified.hint ? ` - ${classified.hint}` : ''}: ${(result.bodyText || '').slice(0, 300)}`, {
      http_status: result.httpStatus,
      runtime: process.version,
      file_sha256: fileSha256,
      size_bytes: info.size,
      attempts: attempt,
      policy_retries: policyRetries,
    })
  }
}

main().catch((err) => {
  out({ status: 'failed', error_code: 'helper_crashed', message: String(err?.stack || err), runtime: process.version })
  process.exit(1)
})
