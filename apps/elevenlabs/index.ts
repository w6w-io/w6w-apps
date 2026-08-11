/**
 * ElevenLabs — generative audio: text-to-speech with per-character timings,
 * speech-to-text, sound effects, the voice catalogue and library, generation
 * history, Studio projects and plan usage, over the ElevenLabs API
 * (`api.elevenlabs.io`).
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-08-11 against ElevenLabs' own OpenAPI 3.1 document
 * (`https://api.elevenlabs.io/openapi.json`, 1,952,556 bytes, md5
 * `78ec1a2a31e9ff37bda5104b64b9b2b1`, 285 paths), against the vendor's own docs
 * pages, and against live probes of `api.elevenlabs.io` and
 * `status.elevenlabs.io`. Nothing here came from a third-party integration
 * directory.
 *
 * The four findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **An ordinary read returns the caller's own API key**
 *     (`lib/client.ts`, `actions/user-get.ts`, `auth/api-key.ts`).
 *     `GET /v1/user` returns `xi_api_key`, documented as "The API key of the
 *     user" and shown in full in the vendor's own schema example. It is deleted
 *     before the Action returns, the masked `xi_api_key_preview` is kept, and
 *     it is emphatically not the health probe.
 *  2. **A wrong key answers HTTP 400, not 401** (`lib/client.ts#classify`).
 *     The vendor's error table documents `authentication_error` as 401, and a
 *     request with *no* credential does answer 401 — but a request with a
 *     *wrong* key answers `400 {"detail":{"type":"authentication_error",
 *     "code":"invalid_api_key"}}`, measured against three separate endpoints.
 *     Everything that decides "is this credential bad?" reads the body, never
 *     the status.
 *  3. **`GET /v1/voices` is public** (`actions/voice-list.ts`,
 *     `auth/api-key.ts`). It answers 200 with 102,976 bytes of catalogue to a
 *     request carrying no credential at all, so it can never be the probe and
 *     is not the list this app uses. `GET /v2/voices` requires a credential,
 *     pages and filters.
 *  4. **The audio endpoints answer bytes, not JSON** (`lib/client.ts#binary`).
 *     Text to Speech, Generate Sound Effect and Get History Audio each declare
 *     one `200` of content type `audio/mpeg` with a binary schema; `res.json()`
 *     throws on the first byte. They are read as bytes and base64-encoded, with
 *     the served content type returned verbatim — while the `/with-timestamps`
 *     TTS variant answers JSON carrying the same audio already encoded, plus
 *     alignment, for the same cost.
 *
 * Two units coexist in this API and neither is wrong: `start_unix`/`end_unix` on
 * the usage endpoint are **milliseconds**, while every other Unix timestamp in
 * the covered surface — history dates, the character-reset time — is in
 * **seconds**.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import textToSpeech from "./actions/text-to-speech.ts";
import textToSpeechWithTimestamps from "./actions/text-to-speech-with-timestamps.ts";
import speechToText from "./actions/speech-to-text.ts";
import soundGeneration from "./actions/sound-generation.ts";

import voiceList from "./actions/voice-list.ts";
import voiceGet from "./actions/voice-get.ts";
import voiceSettingsGet from "./actions/voice-settings-get.ts";
import voiceSettingsDefaultGet from "./actions/voice-settings-default-get.ts";
import voiceSettingsEdit from "./actions/voice-settings-edit.ts";
import voiceLibrarySearch from "./actions/voice-library-search.ts";
import voiceAddFromLibrary from "./actions/voice-add-from-library.ts";
import voiceDelete from "./actions/voice-delete.ts";

import modelList from "./actions/model-list.ts";

import historyList from "./actions/history-list.ts";
import historyGet from "./actions/history-get.ts";
import historyAudioGet from "./actions/history-audio-get.ts";
import historyDelete from "./actions/history-delete.ts";

import studioProjectList from "./actions/studio-project-list.ts";
import studioProjectGet from "./actions/studio-project-get.ts";

import userGet from "./actions/user-get.ts";
import subscriptionGet from "./actions/subscription-get.ts";
import usageCharacterStatsGet from "./actions/usage-character-stats-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import requestRate from "./health/request-rate.ts";

export default {
  actions: [
    // Speech
    textToSpeech,
    textToSpeechWithTimestamps,
    speechToText,
    soundGeneration,
    // Voices
    voiceList,
    voiceGet,
    voiceSettingsGet,
    voiceSettingsDefaultGet,
    voiceSettingsEdit,
    voiceLibrarySearch,
    voiceAddFromLibrary,
    voiceDelete,
    // Models
    modelList,
    // History
    historyList,
    historyGet,
    historyAudioGet,
    historyDelete,
    // Studio
    studioProjectList,
    studioProjectGet,
    // Account
    userGet,
    subscriptionGet,
    usageCharacterStatsGet,
  ],
  // API key only. ElevenLabs publishes no OAuth surface for third-party apps;
  // the `xi-api-key` header is the whole authentication story, and the vendor's
  // own guidance for a backend integration is a service-account key, scoped and
  // IP-restricted.
  auth: [apiKey],
  healthChecks: [service, quota, requestRate],
} satisfies AppDefinition;
