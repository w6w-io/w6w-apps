/**
 * AssemblyAI — speech-to-text and audio intelligence, over the AssemblyAI API v2
 * (`api.assemblyai.com` / `api.eu.assemblyai.com`).
 *
 * Every path, verb, query parameter, body field and status code in this app was verified
 * on 2026-08-29 against AssemblyAI's own machine-readable OpenAPI document
 * (`www.assemblyai.com/docs/openapi.json`, Fern-generated, `info.version` 1.3.4) plus
 * AssemblyAI's own hand-written docs (`assemblyai.com/docs/api-reference/*`,
 * `.../pre-recorded-audio/*`, `.../pii-redaction`, `.../llm-gateway/*`,
 * `.../getting-started/error-handling`) and live probes against `api.assemblyai.com` and
 * `status.assemblyai.com`. Nothing here came from a third-party integration directory.
 *
 * The findings that shaped the design, each documented in full where it matters:
 *
 *  1. **No `Bearer` prefix** (`auth/api-token.ts`). AssemblyAI's OpenAPI security scheme is
 *     a bare `Authorization: <key>` header — the same "check there's no Bearer prefix" note
 *     that AssemblyAI's own error-handling guide gives for a 401.
 *  2. **No upload action** (`transcript-submit.ts`, and every other action). `POST
 *     /v2/upload` takes a raw `application/octet-stream` body; this app's sandbox coerces
 *     every `ctx.fetch` body to a string en route to the network, the same constraint this
 *     pack's `box`, `documenso` and `cloudconvert` apps document for their own upload
 *     endpoints. Every action here works with a publicly reachable URL instead — the
 *     alternative AssemblyAI itself documents as the normal path.
 *  3. **No synchronous host** (`actions/transcript-wait.ts`). Unlike CloudConvert's
 *     `sync.api.cloudconvert.com` twin of every path, AssemblyAI offers no "block until
 *     done" endpoint at all — its own docs' worked examples poll on an interval, so
 *     `transcript-wait`/`transcript-submit-and-wait` do the same instead of pretending a
 *     sync call exists.
 *  4. **A 401 is not always "bad key"** (`auth/api-token.ts`, `health/quota.ts`).
 *     AssemblyAI's own error-handling reference: "Missing/invalid Authorization, disabled
 *     account, or **insufficient balance**." There is no API-readable balance endpoint to
 *     tell those apart, so this app's auth `test` message says so rather than only
 *     pointing at the key.
 *  5. **LeMUR has fully sunset (2026-03-31)** and Audio Intelligence's chapter/summary
 *     params are deprecated in favor of **LLM Gateway**, a separate general-purpose LLM
 *     chat-completions proxy (`llm-gateway.assemblyai.com/v1/chat/completions`) that is not
 *     specific to speech-to-text. This app covers AssemblyAI's core Speech-to-Text +
 *     Audio Intelligence surface; LLM Gateway is deliberately out of scope — see the
 *     README's "Deliberately not covered" section.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import transcriptSubmit from "./actions/transcript-submit.ts";
import transcriptSubmitAndWait from "./actions/transcript-submit-and-wait.ts";
import transcriptGet from "./actions/transcript-get.ts";
import transcriptWait from "./actions/transcript-wait.ts";
import transcriptList from "./actions/transcript-list.ts";
import transcriptDelete from "./actions/transcript-delete.ts";
import transcriptSentencesGet from "./actions/transcript-sentences-get.ts";
import transcriptParagraphsGet from "./actions/transcript-paragraphs-get.ts";
import transcriptSubtitlesGet from "./actions/transcript-subtitles-get.ts";
import transcriptWordSearch from "./actions/transcript-word-search.ts";
import transcriptRedactedAudioGet from "./actions/transcript-redacted-audio-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    transcriptSubmit,
    transcriptSubmitAndWait,
    transcriptGet,
    transcriptWait,
    transcriptList,
    transcriptDelete,
    transcriptSentencesGet,
    transcriptParagraphsGet,
    transcriptSubtitlesGet,
    transcriptWordSearch,
    transcriptRedactedAudioGet,
  ],
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
