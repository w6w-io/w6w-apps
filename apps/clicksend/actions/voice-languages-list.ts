import type { ActionDefinition } from "@w6w/types";
import { ClickSendClient } from "../lib/client.ts";

type Input = Record<string, never>;

export interface VoiceLanguage {
  code?: string;
  country?: string;
  gender?: string | string[];
}

/**
 * `GET /voice/lang` — the language codes and supported voice genders `send-voice`
 * accepts.
 *
 * Not every language supports both `voice: "female"` and `voice: "male"` — several
 * (e.g. `en-in`, `fr-ca`) list only one gender in ClickSend's own reference. Picking
 * an unsupported combination is rejected as `INVALID_VOICE` inside a 200 batch
 * response from `send-voice`, not a 4xx, so checking here first avoids a queued
 * call that silently fails per-recipient.
 */
const voiceLanguagesList: ActionDefinition<Input> = {
  key: "voice-languages-list",
  type: "read",
  resource: "voice",
  title: "List Voice Languages",
  description:
    "List the language codes and supported genders for Send Voice Call (GET /voice/lang).",
  params: [],
  output: [{ key: "languages", type: "array", label: "Languages" }],

  async execute(_input, ctx) {
    const client = new ClickSendClient(ctx);
    const languages = await client.data<VoiceLanguage[]>("/voice/lang");
    return { languages: languages ?? [] };
  },
};

export default voiceLanguagesList;
