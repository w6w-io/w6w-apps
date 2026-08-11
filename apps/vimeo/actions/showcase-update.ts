import type { ActionDefinition } from "@w6w/types";
import { compact, idFromRef, toCsv, VimeoClient } from "../lib/client.ts";
import {
  fieldsParam,
  showcaseContentSortOptions,
  showcaseIdParam,
  showcaseLayoutOptions,
  showcasePrivacyOptions,
  showcaseThemeOptions,
} from "../lib/params.ts";

/**
 * `PATCH /me/albums/{album_id}` — edit a showcase.
 *
 * Almost the same body as create, with two differences the reference makes
 * explicit and this action follows:
 *
 *  - `name` is **not** required on edit (it is on create), so it is optional
 *    here. Only the fields present are applied.
 *  - Edit adds three fields create does not have — `url` (the custom Vimeo
 *    slug), `domain` (a custom domain) and `use_custom_domain`. `hide_from_vimeo`
 *    goes the other way: it is a create-only field, so it is absent here.
 *
 * `idempotent: true` — re-sending the same patch converges.
 */
interface Input {
  showcaseId: string;
  name?: string;
  description?: string;
  privacy?: string;
  password?: string;
  layout?: string;
  theme?: string;
  sort?: string;
  brandColor?: string;
  hideNav?: boolean;
  hideUpcoming?: boolean;
  reviewMode?: boolean;
  url?: string;
  domain?: string;
  useCustomDomain?: boolean;
  fields?: string;
}

const showcaseUpdate: ActionDefinition<Input> = {
  key: "showcase-update",
  type: "perform",
  resource: "showcase",
  title: "Update Showcase",
  description: "Edit a showcase's name, description, privacy, appearance or custom URL.",
  idempotent: true,
  params: [
    showcaseIdParam,
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "privacy", label: "Privacy", type: "select", options: showcasePrivacyOptions },
    {
      key: "password",
      label: "Password",
      type: "secret",
      hint: "Required when Privacy is `password`.",
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
    { key: "brandColor", label: "Brand colour", type: "string", placeholder: "ff66ee" },
    { key: "hideNav", label: "Hide Vimeo navigation", type: "boolean" },
    { key: "hideUpcoming", label: "Hide the upcoming event", type: "boolean" },
    { key: "reviewMode", label: "Review mode", type: "boolean" },
    {
      key: "url",
      label: "Custom Vimeo URL",
      type: "string",
      placeholder: "my-custom-url",
      hint: "The trailing slug only. Edit-only — it cannot be set at creation.",
    },
    {
      key: "domain",
      label: "Custom domain",
      type: "string",
      placeholder: "mycustomdomain.com",
      hint: "Needs Use custom domain turned on as well.",
    },
    { key: "useCustomDomain", label: "Use custom domain", type: "boolean" },
    fieldsParam,
  ],
  output: [
    { key: "uri", type: "string", label: "The showcase's canonical URI" },
    { key: "name", type: "string", label: "Showcase name" },
  ],

  execute(input, ctx) {
    return new VimeoClient(ctx).request(
      `/me/albums/${idFromRef(input.showcaseId, "Showcase ID")}`,
      {
        method: "PATCH",
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
          review_mode: input.reviewMode,
          url: input.url,
          domain: input.domain,
          use_custom_domain: input.useCustomDomain,
        }),
      },
    );
  },
};

export default showcaseUpdate;
