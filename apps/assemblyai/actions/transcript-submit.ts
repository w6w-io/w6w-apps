import type { ActionDefinition } from "@w6w/types";
import { AssemblyAiClient } from "../lib/client.ts";
import {
  regionParam,
  transcriptOptionParams,
  transcriptOptionsBody,
  type TranscriptOptionsInput,
  transcriptOutputFields,
} from "../lib/params.ts";

/**
 * `POST /v2/transcript` — submit a URL-reachable audio/video file for transcription and
 * return immediately.
 *
 * ## Asynchronous: the response is a *starting* transcript, not a result
 *
 * You get the transcript back in `queued` or `processing` status (`queued` only when the
 * account's parallel-transcription rate limit is currently exceeded — otherwise straight
 * to `processing`). The normal shape for anything that needs the text is: submit here,
 * then poll `transcript-get`/`transcript-wait` until `status` is `completed` or `error`,
 * or set a Webhook URL and let AssemblyAI push the result instead.
 * `transcript-submit-and-wait` does both steps in one call for the common case.
 *
 * ## Audio Intelligence is a set of flags on this SAME call
 *
 * Every add-on this app exposes — speaker diarization, key phrases, content moderation,
 * topic detection, entity detection, sentiment analysis, PII redaction — is a parameter
 * on this one request, not a separate submit step; see `lib/params.ts` for the full list
 * and which ones require which others (e.g. Redact PII requires Format text; Speaker
 * diarization requires Punctuate).
 *
 * ## Not idempotent, and there is no idempotency key
 *
 * AssemblyAI documents no idempotency key for transcript creation. Every call starts a
 * new (separately billed) transcription job, so a retry duplicates both the job and the
 * spend.
 */
interface Input extends TranscriptOptionsInput {
  audioUrl: string;
  region?: string;
}

const transcriptSubmit: ActionDefinition<Input> = {
  key: "transcript-submit",
  type: "perform",
  resource: "transcript",
  title: "Submit Transcript",
  description: "Submit a URL-reachable audio or video file for transcription and return " +
    "immediately, without waiting for it to finish. Audio Intelligence add-ons (speaker " +
    "labels, key phrases, content moderation, topic detection, entity detection, sentiment " +
    "analysis, PII redaction) are enabled as flags on this same call.",
  idempotent: false,
  params: [
    {
      key: "audioUrl",
      label: "Audio/video URL",
      type: "string",
      required: true,
      placeholder: "https://assembly.ai/wildfires.mp3",
      hint: "A publicly reachable URL to the media file. Uploading a local file's bytes is " +
        "not supported by this app — see the README.",
    },
    ...transcriptOptionParams(),
    regionParam,
  ],
  output: transcriptOutputFields,

  execute(input, ctx) {
    ctx.log("info", "submitting AssemblyAI transcript", { audioUrl: input.audioUrl });
    return new AssemblyAiClient(ctx).json("/transcript", {
      region: input.region,
      method: "POST",
      body: { audio_url: input.audioUrl, ...transcriptOptionsBody(input) },
    });
  },
};

export default transcriptSubmit;
