import type { ActionDefinition } from "@w6w/types";
import { AssemblyAiClient } from "../lib/client.ts";
import {
  regionParam,
  transcriptOptionParams,
  transcriptOptionsBody,
  type TranscriptOptionsInput,
  transcriptOutputFields,
} from "../lib/params.ts";

interface TranscriptStatusBody {
  id?: string;
  status?: string;
  error?: string;
  [k: string]: unknown;
}

/**
 * Submit a transcript (`POST /v2/transcript`) and poll `GET /v2/transcript/{id}` until it
 * reaches a terminal status, returning the completed transcript.
 *
 * The convenience twin of `transcript-submit` + `transcript-wait` combined, for the common
 * case of "transcribe this and give me the text" in one step. Unlike `transcript-wait`
 * (which returns an `error`-status transcript rather than throwing, mirroring
 * `transcript-get`), this action **throws** when the transcription fails — the point of a
 * "submit and wait for the result" action is to hand back a usable result or fail loudly,
 * not a value that looks like success.
 */
interface Input extends TranscriptOptionsInput {
  audioUrl: string;
  pollIntervalSeconds?: number;
  timeoutSeconds?: number;
  region?: string;
}

const transcriptSubmitAndWait: ActionDefinition<Input> = {
  key: "transcript-submit-and-wait",
  type: "perform",
  resource: "transcript",
  title: "Submit Transcript and Wait",
  description: "Submit a URL-reachable audio or video file for transcription and block " +
    "until it completes or fails, returning the finished transcript. Throws if the " +
    "transcription itself fails.",
  idempotent: false,
  params: [
    {
      key: "audioUrl",
      label: "Audio/video URL",
      type: "string",
      required: true,
      placeholder: "https://assembly.ai/wildfires.mp3",
      hint: "A publicly reachable URL to the media file.",
    },
    ...transcriptOptionParams(),
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
    ctx.log("info", "submitting AssemblyAI transcript and waiting", { audioUrl: input.audioUrl });
    let transcript = await client.json<TranscriptStatusBody>("/transcript", {
      region: input.region,
      method: "POST",
      body: { audio_url: input.audioUrl, ...transcriptOptionsBody(input) },
    });

    const path = `/transcript/${encodeURIComponent(transcript.id ?? "")}`;
    const intervalMs = Math.max(0, input.pollIntervalSeconds ?? 3) * 1000;
    const timeoutSeconds = input.timeoutSeconds ?? 300;
    const deadline = Date.now() + Math.max(0, timeoutSeconds) * 1000;

    while (transcript.status !== "completed" && transcript.status !== "error") {
      if (Date.now() >= deadline) {
        throw new Error(
          `transcript ${transcript.id} did not reach a terminal status within ` +
            `${timeoutSeconds}s (last status: ${transcript.status})`,
        );
      }
      ctx.log("debug", "polling AssemblyAI transcript", {
        transcriptId: transcript.id,
        status: transcript.status,
      });
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      transcript = await client.json<TranscriptStatusBody>(path, { region: input.region });
    }

    if (transcript.status === "error") {
      throw new Error(`AssemblyAI transcription failed: ${transcript.error ?? "unknown error"}`);
    }
    return transcript;
  },
};

export default transcriptSubmitAndWait;
