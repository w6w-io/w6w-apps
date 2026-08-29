import type { ActionDefinition } from "@w6w/types";
import { AssemblyAiClient } from "../lib/client.ts";
import { regionParam, transcriptIdParam, transcriptOutputFields } from "../lib/params.ts";

interface TranscriptStatusBody {
  status?: string;
  [k: string]: unknown;
}

/**
 * Poll `GET /v2/transcript/{id}` until `status` is `completed` or `error`, then return it.
 *
 * AssemblyAI has no synchronous "block until done" host (unlike CloudConvert's
 * `sync.api.cloudconvert.com` twin of every path) — its own docs' worked examples poll on
 * a fixed interval instead, so this action does the same rather than a single blocking
 * call the vendor does not offer. A Webhook URL on `transcript-submit` avoids polling
 * altogether when that fits the workflow better.
 *
 * Returns the transcript **whatever its terminal status** — `error` included, with the
 * failure detail in the `error` field — mirroring `transcript-get`; it does not throw on
 * a failed transcription. It only throws when the poll budget itself runs out.
 * `transcript-submit-and-wait` is the higher-level convenience that submits, waits, AND
 * throws on `error`.
 */
interface Input {
  transcriptId: string;
  pollIntervalSeconds?: number;
  timeoutSeconds?: number;
  region?: string;
}

const transcriptWait: ActionDefinition<Input> = {
  key: "transcript-wait",
  type: "read",
  resource: "transcript",
  title: "Wait for Transcript",
  description: "Poll a transcript until it reaches a terminal status (completed or error), " +
    "then return it.",
  params: [
    transcriptIdParam,
    {
      key: "pollIntervalSeconds",
      label: "Poll interval (seconds)",
      type: "number",
      advanced: true,
      default: 3,
      validation: { min: 0 },
      hint: "How long to wait between polls.",
    },
    {
      key: "timeoutSeconds",
      label: "Timeout (seconds)",
      type: "number",
      advanced: true,
      default: 300,
      validation: { min: 1 },
      hint: "Give up and fail this action after this many seconds of polling.",
    },
    regionParam,
  ],
  output: transcriptOutputFields,

  async execute(input, ctx) {
    const client = new AssemblyAiClient(ctx);
    const path = `/transcript/${encodeURIComponent(input.transcriptId)}`;
    const intervalMs = Math.max(0, input.pollIntervalSeconds ?? 3) * 1000;
    const timeoutSeconds = input.timeoutSeconds ?? 300;
    const deadline = Date.now() + Math.max(0, timeoutSeconds) * 1000;

    let transcript = await client.json<TranscriptStatusBody>(path, { region: input.region });
    while (transcript.status !== "completed" && transcript.status !== "error") {
      if (Date.now() >= deadline) {
        throw new Error(
          `transcript ${input.transcriptId} did not reach a terminal status within ` +
            `${timeoutSeconds}s (last status: ${transcript.status})`,
        );
      }
      ctx.log("debug", "polling AssemblyAI transcript", {
        transcriptId: input.transcriptId,
        status: transcript.status,
      });
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      transcript = await client.json<TranscriptStatusBody>(path, { region: input.region });
    }
    return transcript;
  },
};

export default transcriptWait;
