import type { ActionDefinition } from "@w6w/types";
import { toList, TwitchClient } from "../lib/client.ts";
import { broadcasterIdParam, settableCclOptions } from "../lib/params.ts";

/**
 * `PATCH /helix/channels` — Modify Channel Information.
 *
 * **Requires a user access token with the `channel:manage:broadcast` scope**,
 * and `broadcaster_id` must be that same user. An app access token cannot do
 * this at all.
 *
 * Three details from the reference that shape the code:
 *
 *  - **`broadcaster_id` is a query parameter; everything you are changing is in
 *    the body.** Putting `title` in the query silently changes nothing.
 *  - **At least one field must be present**, and `title` may not be an empty
 *    string. `game_id` uses `"0"` or `""` to *unset* the category, which is why
 *    the empty string is forwarded for that one field rather than dropped as
 *    "not supplied".
 *  - **Success is `204 No Content`.** There is no response body to return, so
 *    this action reports the status rather than inventing one. Read the channel
 *    back with Get Channel Information if you need to confirm.
 *
 * `tags` are replaced wholesale, not merged: sending one tag leaves the channel
 * with exactly that tag. Sending an empty list clears them, and the reference
 * documents that explicitly — so an empty list is forwarded rather than dropped.
 *
 * Content classification labels are sent as `{id, is_enabled}` pairs, and Twitch
 * only changes the ones named. The seventh label Get Content Classification
 * Labels returns, `MatureGame`, is applied by Twitch from the category and
 * cannot be set here, so it is not offered.
 *
 * `idempotent: true` — this is a full replacement of the named fields with the
 * values given, so running it twice leaves the channel exactly as running it
 * once does.
 */
interface Input {
  broadcasterId: string;
  title?: string;
  gameId?: string;
  broadcasterLanguage?: string;
  delay?: number;
  tags?: string[] | string;
  setTags?: boolean;
  contentClassificationLabels?: string[] | string;
  setContentClassificationLabels?: boolean;
  isBrandedContent?: boolean;
}

interface Ccl {
  id: string;
  is_enabled: boolean;
}

const modifyChannelInformation: ActionDefinition<Input, { status: number }> = {
  key: "modify-channel-information",
  type: "perform",
  title: "Modify Channel Information",
  description:
    "Update the broadcaster's own stream title, category, language, tags, content classification " +
    "labels or branded-content flag. Requires a user access token with the " +
    "channel:manage:broadcast scope, for the same user as the broadcaster ID.",
  resource: "channel",
  idempotent: true,
  params: [
    broadcasterIdParam(
      "Must be the same user the access token belongs to — Twitch refuses to let one user edit " +
        "another's channel.",
    ),
    {
      key: "title",
      label: "Stream title",
      type: "string",
      hint: "May not be set to an empty string. Leave blank to keep the current title.",
    },
    {
      key: "gameId",
      label: "Category ID",
      type: "string",
      hint: 'The ID of the game or category, from Search Categories or Get Games. Use "0" to ' +
        "clear the category. An ID Twitch does not recognise is ignored rather than rejected.",
    },
    {
      key: "broadcasterLanguage",
      label: "Language",
      type: "string",
      placeholder: "en",
      hint: 'ISO 639-1 two-letter code, or "other". An unsupported code is ignored.',
    },
    {
      key: "delay",
      label: "Stream delay (seconds)",
      type: "number",
      validation: { integer: true, min: 0, max: 900 },
      hint: "Partner accounts only; the request fails for anyone else. Maximum 900 seconds.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Up to 10 comma-separated tags, each at most 25 characters with no spaces or special " +
        'characters. Tags REPLACE the current set. To clear them, tick "Replace tags" and leave ' +
        "this empty.",
    },
    {
      key: "setTags",
      label: "Replace tags",
      type: "boolean",
      hint: "Send the tags field even when it is empty, which clears every tag on the channel. " +
        'Off by default so an empty box means "leave tags alone".',
    },
    {
      key: "contentClassificationLabels",
      label: "Enable content classification labels",
      type: "multiselect",
      options: settableCclOptions,
      hint: 'Labels listed here are enabled. With "Replace labels" ticked, every label not ' +
        "listed is disabled.",
    },
    {
      key: "setContentClassificationLabels",
      label: "Replace labels",
      type: "boolean",
      hint: "Send an explicit is_enabled=false for every label not selected above, which is how " +
        "Twitch documents clearing them.",
    },
    {
      key: "isBrandedContent",
      label: "Branded content",
      type: "boolean",
      hint: "Leave unset to keep the current value.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  async execute(input, ctx) {
    const body: Record<string, unknown> = {};
    if (input.title !== undefined && input.title !== "") body.title = input.title;
    // "0" and "" both mean "clear the category", so an empty string is meaningful here.
    if (input.gameId !== undefined && input.gameId !== null) body.game_id = input.gameId;
    if (input.broadcasterLanguage) body.broadcaster_language = input.broadcasterLanguage;
    if (typeof input.delay === "number") body.delay = input.delay;
    if (typeof input.isBrandedContent === "boolean") {
      body.is_branded_content = input.isBrandedContent;
    }

    const tags = toList(input.tags);
    if (tags) body.tags = tags;
    else if (input.setTags) body.tags = [];

    const enabled = toList(input.contentClassificationLabels) ?? [];
    if (enabled.length > 0 || input.setContentClassificationLabels) {
      const labels: Ccl[] = input.setContentClassificationLabels
        ? settableCclOptions.map((o) => ({ id: o.value, is_enabled: enabled.includes(o.value) }))
        : enabled.map((id) => ({ id, is_enabled: true }));
      body.content_classification_labels = labels;
    }

    if (Object.keys(body).length === 0) {
      throw new Error("Modify Channel Information needs at least one field to change");
    }

    ctx.log("info", "twitch: modify channel information", { fields: Object.keys(body) });
    const status = await new TwitchClient(ctx).status("/channels", {
      method: "PATCH",
      query: { broadcaster_id: input.broadcasterId },
      body,
    });
    return { status };
  },
};

export default modifyChannelInformation;
