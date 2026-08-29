import type { ActionDefinition } from "@w6w/types";
import { BlandClient } from "../lib/client.ts";

/**
 * `GET /v1/voices/{id}` — one voice's full record.
 *
 * Verified against `docs.bland.ai/api-v1/get/voices-id`. `id` accepts either
 * a voice UUID or a curated voice's name (e.g. `maya`).
 */
interface Input {
  voiceId: string;
}

const voiceGet: ActionDefinition<Input> = {
  key: "voice-get",
  type: "read",
  resource: "voice",
  title: "Get Voice",
  description: "Get details on a single voice, by UUID or curated voice name (e.g. maya).",
  params: [
    { key: "voiceId", label: "Voice ID or Name", type: "string", required: true },
  ],
  output: [
    { key: "voice", type: "object", label: "Voice record" },
  ],

  async execute(input, ctx) {
    const res = await new BlandClient(ctx).request<{ voice?: unknown }>(
      `/v1/voices/${encodeURIComponent(input.voiceId)}`,
    );
    return { voice: res.voice };
  },
};

export default voiceGet;
