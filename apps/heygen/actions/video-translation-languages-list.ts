import type { ActionDefinition } from "@w6w/types";
import { HeyGenClient } from "../lib/client.ts";

/**
 * `GET /v3/video-translations/languages` — the exact target-language strings
 * `video-translation-create`'s `outputLanguages` expects (e.g. `"Spanish (Spain)"`, not an ISO
 * code). No pagination or params.
 */
const videoTranslationLanguagesList: ActionDefinition = {
  key: "video-translation-languages-list",
  type: "read",
  resource: "video-translation",
  title: "List Supported Translation Languages",
  description: "List the exact target-language names accepted by Create Video Translation.",
  params: [],
  output: [{ key: "languages", type: "array", label: "Supported target language names" }],

  async execute(_input, ctx) {
    const client = new HeyGenClient(ctx);
    const body = await client.data<{ languages?: string[] }>("/v3/video-translations/languages");
    return { languages: body?.languages ?? [] };
  },
};

export default videoTranslationLanguagesList;
