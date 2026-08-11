import type { ActionDefinition } from "@w6w/types";
import { nest, toArray, toCsv, VimeoClient } from "../lib/client.ts";
import { commentPrivacyOptions, videoPrivacyEmbedOptions } from "../lib/params.ts";

/**
 * `PATCH /me` — edit the connected account's profile and upload defaults.
 *
 * ## The `videos.privacy.*` fields are DEFAULTS, not a bulk edit
 *
 * This is the part worth reading twice. Vimeo documents `videos.privacy.view`
 * on the user body as "Who can access the user's videos **by default**", and
 * `videos.privacy.download` as "This value becomes the default download setting
 * for all future videos that the user uploads." They change what the *next*
 * upload inherits. They do not retroactively change existing videos, and an
 * operator expecting "make everything private" from this action will not get
 * it — that is `video-update`, per video.
 *
 * ## `videos.privacy.view` is a narrower enum than a video's
 *
 * The user body accepts `anybody`, `contacts`, `disable`, `nobody`, `password`,
 * `unlisted`, `users` — note the absence of `team`, which a *video* accepts.
 * Vimeo also marks `contacts` deprecated in this position. The list here is the
 * user one, not the video one, deliberately.
 *
 * ## What is left out
 *
 * The body also documents a `password` field ("the default password for all
 * future videos that this user uploads"). It is omitted: it is an
 * account-wide secret with an awkward joint requirement — it is usable only
 * when `videos.privacy.view` is already `password` — and setting a default
 * password for every future upload from a workflow is not an operation worth
 * making easy. It can be set in Vimeo's own settings. The README says so.
 *
 * `idempotent: true` — re-sending the same patch converges. Unset params are
 * absent from the body and so are left untouched.
 */
interface Input {
  name?: string;
  bio?: string;
  location?: string;
  link?: string;
  videosPrivacyView?: string;
  videosPrivacyEmbed?: string;
  videosPrivacyDownload?: boolean;
  videosPrivacyComments?: string;
  videosPrivacyAdd?: boolean;
  embedAllowedDomains?: string;
  fields?: string;
}

/** The user body's own `videos.privacy.view` enum — narrower than a video's. */
const userVideoPrivacyViewOptions = [
  { value: "anybody", label: "Anybody — public" },
  { value: "contacts", label: "Contacts only (deprecated by Vimeo)" },
  { value: "disable", label: "Disable — embed-only, hidden on Vimeo" },
  { value: "nobody", label: "Nobody" },
  { value: "password", label: "Password" },
  { value: "unlisted", label: "Unlisted" },
  { value: "users", label: "Vimeo users only" },
];

const userUpdate: ActionDefinition<Input> = {
  key: "user-update",
  type: "perform",
  resource: "user",
  title: "Update My Account",
  description:
    "Edit the connected account's profile and the privacy defaults applied to future uploads. " +
    "Does not change existing videos.",
  idempotent: true,
  params: [
    { key: "name", label: "Display name", type: "string" },
    { key: "bio", label: "Bio", type: "text" },
    { key: "location", label: "Location", type: "string", placeholder: "New York City" },
    {
      key: "link",
      label: "Custom Vimeo URL",
      type: "string",
      placeholder: "staff",
      hint: "The trailing part only.",
    },
    {
      key: "videosPrivacyView",
      label: "Default: who can watch",
      type: "select",
      options: userVideoPrivacyViewOptions,
      hint: "Applies to future uploads. Existing videos are unaffected.",
    },
    {
      key: "videosPrivacyEmbed",
      label: "Default: where it can be embedded",
      type: "select",
      options: videoPrivacyEmbedOptions,
    },
    { key: "videosPrivacyDownload", label: "Default: allow downloads", type: "boolean" },
    {
      key: "videosPrivacyComments",
      label: "Default: who can comment",
      type: "select",
      options: commentPrivacyOptions,
    },
    {
      key: "videosPrivacyAdd",
      label: "Default: others may add to collections",
      type: "boolean",
    },
    {
      key: "embedAllowedDomains",
      label: "Default embed allowlist",
      type: "string",
      placeholder: "example.com,partner.example",
      hint: "Comma-separated. Only meaningful when the default embed privacy is `whitelist`.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      placeholder: "uri,name,link",
      hint: "Trim the returned representation — otherwise it includes the account's cleartext " +
        "default video password under `preferences.videos.password`.",
    },
  ],
  output: [
    { key: "uri", type: "string", label: "The user's canonical URI" },
    { key: "name", type: "string", label: "Display name" },
  ],

  execute(input, ctx) {
    const body = nest({
      name: input.name,
      bio: input.bio,
      location: input.location,
      link: input.link,
      "videos.privacy.view": input.videosPrivacyView,
      "videos.privacy.embed": input.videosPrivacyEmbed,
      "videos.privacy.download": input.videosPrivacyDownload,
      "videos.privacy.comments": input.videosPrivacyComments,
      "videos.privacy.add": input.videosPrivacyAdd,
      "videos.privacy.embed_allowed_domains": toArray(input.embedAllowedDomains),
    });

    return new VimeoClient(ctx).request("/me", {
      method: "PATCH",
      query: { fields: toCsv(input.fields) },
      body,
    });
  },
};

export default userUpdate;
