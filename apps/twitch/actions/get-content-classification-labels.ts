import type { ActionDefinition } from "@w6w/types";
import { TwitchClient } from "../lib/client.ts";

/**
 * `GET /helix/content_classification_labels` — Get Content Classification Labels.
 *
 * The labels a broadcaster may flag their channel with, localised. The only
 * parameter is `locale`, defaulting to `en-US`; Twitch documents 30 supported
 * locales (its list contains `da-DK` twice, so 29 distinct ones).
 *
 * Seven labels come back, but only **six** can be set through Modify Channel
 * Information: `MatureGame` is applied by Twitch from the channel's category
 * and is read-only. That difference is why `lib/params.ts` keeps a separate,
 * shorter option list for the write path.
 *
 * This is also the endpoint the `quota` health check probes, for the same
 * reasons it is a good action: no required parameters, no scope, either token
 * kind, and a small static body.
 */
interface Input {
  locale?: string;
}

const getContentClassificationLabels: ActionDefinition<Input> = {
  key: "get-content-classification-labels",
  type: "read",
  title: "Get Content Classification Labels",
  description:
    "List Twitch's content classification labels with localised names and descriptions. Seven " +
    "are returned; only six of them can be set on a channel, because MatureGame is applied by " +
    "Twitch from the category.",
  resource: "channel",
  params: [
    {
      key: "locale",
      label: "Locale",
      type: "string",
      placeholder: "en-US",
      hint: "One locale only. Twitch's default is en-US; it documents 29 others, from bg-BG to " +
        "zh-TW.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Content classification labels" },
    { key: "data[].id", type: "string", label: "Label ID, e.g. Gambling" },
    { key: "data[].name", type: "string", label: "Localised name" },
    { key: "data[].description", type: "string", label: "Localised description" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "twitch: get content classification labels");
    return await new TwitchClient(ctx).get("/content_classification_labels", {
      locale: input.locale,
    });
  },
};

export default getContentClassificationLabels;
