import type { ActionDefinition } from "@w6w/types";
import { idFromRef, nest, toArray, toCsv, VimeoClient } from "../lib/client.ts";
import {
  commentPrivacyOptions,
  licenseOptions,
  videoIdParam,
  videoPrivacyEmbedOptions,
  videoPrivacyViewOptions,
} from "../lib/params.ts";

/**
 * `PATCH /videos/{video_id}` — edit a video's metadata and privacy.
 *
 * ## The reference's dot notation is not the wire format
 *
 * `edit_video` documents its body as flat dotted keys — `privacy.view`,
 * `privacy.embed`, `embed.color`, `spatial.projection` — but the JSON body is
 * **nested**, exactly as every worked example in `/api/upload/videos` shows:
 * `{"name":"…","privacy":{"view":"anybody"}}`. Sending the literal key
 * `"privacy.view"` is a different request and Vimeo will not apply it. The
 * `nest()` helper in `lib/client.ts` is the one place that translation lives.
 *
 * ## The two joined fields
 *
 * - `privacy.view: "password"` requires `password`. The video's password is a
 *   real secret, so it is a `type: "secret"` param — masked in the UI and
 *   encrypted at rest — even though it is the caller's own value and not this
 *   connection's credential.
 * - `privacy.embed: "whitelist"` is what makes `embedDomains` meaningful.
 *   Vimeo exposes three separate body fields, `embed_domains` (replace the
 *   whole list), `embed_domains_add` and `embed_domains_delete`; all three are
 *   offered because "add one domain" and "replace the list" are genuinely
 *   different operations and collapsing them would silently drop domains.
 *
 * Marked `idempotent: true`: re-sending the same patch converges on the same
 * video. Only the fields present in the body are touched, so an unset param is
 * left alone rather than blanked — see `nest()`.
 *
 * This is a deliberately partial surface. `edit_video` documents exactly 70
 * body fields; this action sends 16 of them, and every one of the 16 is in
 * that documented list. The 54 left out are mostly embedded-player chrome
 * (`embed.buttons.*`, `embed.cards`, `embed.logos.*`,
 * `embed.sentiment_widgets`, `embed.end_screen`) and 360° `spatial.*`
 * settings — left out rather than half-modelled; the README says so.
 */
interface Input {
  videoId: string;
  name?: string;
  description?: string;
  customUrl?: string;
  license?: string;
  locale?: string;
  hideFromVimeo?: boolean;
  privacyView?: string;
  password?: string;
  privacyEmbed?: string;
  privacyDownload?: boolean;
  privacyComments?: string;
  privacyAdd?: boolean;
  embedColor?: string;
  embedDomains?: string;
  embedDomainsAdd?: string;
  embedDomainsDelete?: string;
  fields?: string;
}

const videoUpdate: ActionDefinition<Input> = {
  key: "video-update",
  type: "perform",
  resource: "video",
  title: "Update Video",
  description: "Edit a video's title, description, privacy, licence and embed settings.",
  idempotent: true,
  params: [
    videoIdParam,
    { key: "name", label: "Title", type: "string" },
    {
      key: "description",
      label: "Description",
      type: "text",
      validation: { maxLength: 5000 },
      hint: "Up to 5000 characters.",
    },
    {
      key: "customUrl",
      label: "Custom link",
      type: "string",
      placeholder: "puppies",
      hint: "The trailing part only — no base URL and no username.",
    },
    { key: "license", label: "Creative Commons licence", type: "select", options: licenseOptions },
    { key: "locale", label: "Locale", type: "string", placeholder: "en-US" },
    { key: "hideFromVimeo", label: "Hide from Vimeo", type: "boolean" },
    {
      key: "privacyView",
      label: "Who can watch",
      type: "select",
      options: videoPrivacyViewOptions,
    },
    {
      key: "password",
      label: "Password",
      type: "secret",
      hint: "Only used when Who can watch is `password`. Note that Vimeo returns this value in " +
        "cleartext on subsequent reads of the video.",
    },
    {
      key: "privacyEmbed",
      label: "Where it can be embedded",
      type: "select",
      options: videoPrivacyEmbedOptions,
    },
    { key: "privacyDownload", label: "Allow downloads", type: "boolean" },
    {
      key: "privacyComments",
      label: "Who can comment",
      type: "select",
      options: commentPrivacyOptions,
    },
    {
      key: "privacyAdd",
      label: "Others may add it to collections",
      type: "boolean",
      hint: "Whether other people can add this video to showcases, channels and groups.",
    },
    {
      key: "embedColor",
      label: "Player colour",
      type: "string",
      placeholder: "#1ab7ea",
      hint: "Hex colour for the embedded player controls.",
    },
    {
      key: "embedDomains",
      label: "Embed allowlist — replace",
      type: "string",
      placeholder: "example.com,partner.example",
      hint: "Comma-separated. Replaces the whole allowlist. Only meaningful when Where it can be " +
        "embedded is `whitelist`.",
    },
    {
      key: "embedDomainsAdd",
      label: "Embed allowlist — add",
      type: "string",
      hint: "Comma-separated domains to add, leaving the rest of the allowlist untouched.",
    },
    {
      key: "embedDomainsDelete",
      label: "Embed allowlist — remove",
      type: "string",
      hint: "Comma-separated domains to remove.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      placeholder: "uri,name,privacy",
      hint: "Trim the returned representation. Supported on PATCH as well as GET, and always as " +
        "a query parameter.",
    },
  ],
  output: [{ key: "uri", type: "string", label: "The updated video" }],

  execute(input, ctx) {
    const body = nest({
      name: input.name,
      description: input.description,
      custom_url: input.customUrl,
      license: input.license,
      locale: input.locale,
      hide_from_vimeo: input.hideFromVimeo,
      "privacy.view": input.privacyView,
      "privacy.embed": input.privacyEmbed,
      "privacy.download": input.privacyDownload,
      "privacy.comments": input.privacyComments,
      "privacy.add": input.privacyAdd,
      "embed.color": input.embedColor,
      password: input.password,
      // `toArray`, not a bare split: a blank param must stay absent, because
      // `embed_domains: []` is a request to clear the allowlist.
      embed_domains: toArray(input.embedDomains),
      embed_domains_add: toArray(input.embedDomainsAdd),
      embed_domains_delete: toArray(input.embedDomainsDelete),
    });

    return new VimeoClient(ctx).request(`/videos/${idFromRef(input.videoId, "Video ID")}`, {
      method: "PATCH",
      query: { fields: toCsv(input.fields) },
      body,
    });
  },
};

export default videoUpdate;
