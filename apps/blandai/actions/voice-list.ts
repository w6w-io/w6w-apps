import type { ActionDefinition } from "@w6w/types";
import { BlandClient } from "../lib/client.ts";

/**
 * `GET /v1/voices` — every voice this account can use: Bland's curated
 * defaults, cloned voices, library additions, and org-owned voices.
 *
 * Verified against `docs.bland.ai/api-v1/get/voices`.
 */
const voiceList: ActionDefinition<Record<string, never>> = {
  key: "voice-list",
  type: "read",
  resource: "voice",
  title: "List Voices",
  description: "List every voice available to this account.",
  params: [],
  output: [
    { key: "voices", type: "array", label: "Voice records" },
  ],

  async execute(_input, ctx) {
    const res = await new BlandClient(ctx).request<{ voices?: unknown[] }>("/v1/voices");
    return { voices: res.voices ?? [] };
  },
};

export default voiceList;
