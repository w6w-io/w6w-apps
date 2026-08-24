import type { ActionDefinition } from "@w6w/types";
import { HeyGenClient } from "../lib/client.ts";

interface Input {
  type?: "public" | "private";
  engine?: string;
  language?: string;
  gender?: string;
  limit?: number;
  token?: string;
}

/**
 * `GET /v3/voices` — voices for video creation and text-to-speech. Pass `engine: "starfish"` to
 * find voices compatible with `voice-speech-generate` (only Starfish-engine voices work there).
 */
const voiceList: ActionDefinition<Input> = {
  key: "voice-list",
  type: "search",
  resource: "voice",
  title: "List Voices",
  description:
    "List available voices, filterable by ownership, engine, language and gender. Filter by " +
    "engine=starfish for voices usable with Generate Speech.",
  params: [
    {
      key: "type",
      label: "Ownership",
      type: "select",
      default: "public",
      options: [{ value: "public", label: "Public" }, { value: "private", label: "Private" }],
    },
    {
      key: "engine",
      label: "Engine",
      type: "string",
      hint: 'Pass "starfish" to find voices usable with Generate Speech.',
    },
    { key: "language", label: "Language", type: "string" },
    { key: "gender", label: "Gender", type: "string" },
    { key: "limit", label: "Limit", type: "number", default: 20, hint: "1-100. Default 20." },
    {
      key: "token",
      label: "Page token",
      type: "string",
      hint: "From a previous call's nextToken.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Voices" },
    { key: "hasMore", type: "boolean", label: "More pages available" },
    { key: "nextToken", type: "string", label: "Cursor for the next page" },
  ],

  async execute(input, ctx) {
    const client = new HeyGenClient(ctx);
    const page = await client.list("/v3/voices", {
      query: {
        type: input.type,
        engine: input.engine,
        language: input.language,
        gender: input.gender,
        limit: input.limit,
        token: input.token,
      },
    });
    return { items: page.items, hasMore: page.hasMore, nextToken: page.nextToken };
  },
};

export default voiceList;
