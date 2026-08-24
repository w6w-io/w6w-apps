import type { ActionDefinition } from "@w6w/types";
import { RetellClient } from "../lib/client.ts";

/**
 * `GET /list-voices` — every voice available to the account.
 *
 * A THIRD pagination shape, and really the absence of one: the response is a
 * bare JSON array, not the `{items, has_more, pagination_key}` envelope
 * `list-agents`/`list-calls`/`list-phone-numbers` share. There is no cursor
 * and no `limit` parameter — the vendor returns the whole catalog every time.
 */
interface VoiceItem {
  voice_id: string;
  voice_name: string;
  provider: string;
  gender: string;
  accent?: string;
  age?: string;
  preview_audio_url?: string;
  [key: string]: unknown;
}

const listVoices: ActionDefinition<Record<string, never>, { items: VoiceItem[] }> = {
  key: "list-voices",
  type: "read",
  resource: "voice",
  title: "List Voices",
  description: "List every voice available to this account. Not paginated — Retell returns the " +
    "whole catalog in one call.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Voices" },
  ],

  async execute(_input, ctx) {
    const items = await new RetellClient(ctx).request<VoiceItem[]>("/list-voices");
    return { items };
  },
};

export default listVoices;
