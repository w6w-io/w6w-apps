import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, PushbulletClient } from "../lib/client.ts";

/**
 * `POST /v2/channels` — create a broadcast channel.
 *
 * `tag` must be globally unique across all of Pushbullet, chosen by the
 * creator. The docs do not state get-or-create behaviour the way `create-chat`
 * and `create-device` (named datasets) do for other vendors — reusing an
 * existing tag is documented nowhere, so this is declared non-idempotent
 * rather than assumed safe to retry.
 */
interface Input {
  tag: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  websiteUrl?: string;
  feedUrl?: string;
  feedFilters?: unknown;
  subscribe?: boolean;
}

const channelCreate: ActionDefinition<Input> = {
  key: "channel-create",
  type: "perform",
  resource: "channel",
  title: "Create Channel",
  description: "Create a broadcast channel that other users can subscribe to.",
  idempotent: false,
  params: [
    {
      key: "tag",
      label: "Tag",
      type: "string",
      required: true,
      hint: "Globally unique identifier for the channel, chosen by you.",
    },
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "imageUrl", label: "Image URL", type: "string", advanced: true },
    { key: "websiteUrl", label: "Website URL", type: "string", advanced: true },
    {
      key: "feedUrl",
      label: "RSS feed URL",
      type: "string",
      advanced: true,
      hint: "If set, posts are created automatically from this RSS feed.",
    },
    {
      key: "feedFilters",
      label: "Feed filters (JSON)",
      type: "json",
      advanced: true,
      hint: 'Only used with an RSS feed. Array of {"field":"title","operator":"contains",' +
        '"value":"...","not":false,"ignore_case":true}.',
    },
    {
      key: "subscribe",
      label: "Subscribe immediately",
      type: "boolean",
      hint: "Create a subscription to this channel for the current account as soon as it exists.",
    },
  ],
  output: [
    { key: "iden", type: "string", label: "Channel ID" },
    { key: "tag", type: "string", label: "Tag" },
  ],

  async execute(input, ctx) {
    return await new PushbulletClient(ctx).json("/channels", {
      method: "POST",
      body: compact({
        tag: input.tag,
        name: input.name,
        description: input.description,
        image_url: input.imageUrl,
        website_url: input.websiteUrl,
        feed_url: input.feedUrl,
        feed_filters: asOptionalJson(input.feedFilters, "feedFilters"),
        subscribe: input.subscribe,
      }),
    });
  },
};

export default channelCreate;
