import type { ActionDefinition } from "@w6w/types";
import { compact, toCsv, VimeoClient } from "../lib/client.ts";
import {
  fieldsParam,
  showcaseContentSortOptions,
  showcaseLayoutOptions,
  showcasePrivacyOptions,
  showcaseThemeOptions,
} from "../lib/params.ts";

/**
 * `POST /me/albums` — create a showcase.
 *
 * `name` is the only required field. `password` is required *only* when
 * `privacy` is `password` — Vimeo's own wording — which is why the two params
 * sit next to each other and the password's hint says so.
 *
 * Unlike a video's, a showcase's `privacy` is a **flat** body field rather than
 * a nested `privacy.view`, and its vocabulary is its own: `anybody`,
 * `embed_only`, `nobody`, `password`, `team`, `unlisted`. Reusing the video
 * enum here would offer values Vimeo rejects.
 *
 * `sort` on this body is the showcase's *own* default ordering for the videos
 * inside it, not the ordering of a list response — a twelve-value enum
 * (`added_first`, `arranged`, `plays`, …) with no relation to the `sort`
 * parameter on `GET /me/albums`.
 *
 * Answers `201`. `idempotent: false`: no idempotency key, no name uniqueness,
 * so a retry creates a second showcase.
 */
interface Input {
  name: string;
  description?: string;
  privacy?: string;
  password?: string;
  layout?: string;
  theme?: string;
  sort?: string;
  brandColor?: string;
  hideNav?: boolean;
  hideUpcoming?: boolean;
  hideFromVimeo?: boolean;
  reviewMode?: boolean;
  fields?: string;
}

const showcaseCreate: ActionDefinition<Input> = {
  key: "showcase-create",
  type: "perform",
  resource: "showcase",
  title: "Create Showcase",
  description: "Create a showcase (what the Vimeo API still calls an album).",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      placeholder: "Vimeo Holiday Videos!",
    },
    { key: "description", label: "Description", type: "text" },
    { key: "privacy", label: "Privacy", type: "select", options: showcasePrivacyOptions },
    {
      key: "password",
      label: "Password",
      type: "secret",
      hint: "Required when Privacy is `password`, ignored otherwise. Vimeo returns it in " +
        "cleartext under `privacy.password` on later reads.",
    },
    { key: "layout", label: "Layout", type: "select", options: showcaseLayoutOptions },
    { key: "theme", label: "Theme", type: "select", options: showcaseThemeOptions },
    {
      key: "sort",
      label: "Video order",
      type: "select",
      options: showcaseContentSortOptions,
      hint: "How the videos are ordered inside the showcase.",
    },
    {
      key: "brandColor",
      label: "Brand colour",
      type: "string",
      placeholder: "ff66ee",
      hint: "Hex code for the player buttons and showcase controls. Vimeo's example omits the " +
        "leading `#`.",
    },
    { key: "hideNav", label: "Hide Vimeo navigation", type: "boolean" },
    { key: "hideUpcoming", label: "Hide the upcoming event", type: "boolean" },
    {
      key: "hideFromVimeo",
      label: "Hide from Vimeo when unlisted",
      type: "boolean",
    },
    {
      key: "reviewMode",
      label: "Review mode",
      type: "boolean",
      hint: "Showcase videos use their review-mode URL.",
    },
    fieldsParam,
  ],
  output: [
    { key: "uri", type: "string", label: "The new showcase's URI" },
    { key: "name", type: "string", label: "Showcase name" },
    { key: "link", type: "string", label: "Public showcase URL" },
  ],

  execute(input, ctx) {
    return new VimeoClient(ctx).request("/me/albums", {
      method: "POST",
      query: { fields: toCsv(input.fields) },
      body: compact({
        name: input.name,
        description: input.description,
        privacy: input.privacy,
        password: input.password,
        layout: input.layout,
        theme: input.theme,
        sort: input.sort,
        brand_color: input.brandColor,
        hide_nav: input.hideNav,
        hide_upcoming: input.hideUpcoming,
        hide_from_vimeo: input.hideFromVimeo,
        review_mode: input.reviewMode,
      }),
    });
  },
};

export default showcaseCreate;
