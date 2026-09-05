import type { ActionDefinition } from "@w6w/types";
import { GammaClient } from "../lib/client.ts";

/**
 * `GET /v1.0/gammas/{gammaId}` — verified against `management/get-gamma.md`.
 * Unlike archive/export/delete, this one accepts EITHER the API file ID
 * (`g_...`) or the doc ID from a `gamma.app/docs/<id>` URL — built for
 * link-preview integrations.
 */
interface Input {
  gammaId: string;
}

const getGamma: ActionDefinition<Input> = {
  key: "get-gamma",
  type: "read",
  resource: "gamma",
  title: "Get Gamma",
  description:
    "Fetch title, thumbnail, URL, and other metadata for a single gamma. Accepts a file ID or " +
    "the doc ID from the web app's document URL.",
  params: [
    { key: "gammaId", label: "Gamma or Doc ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Gamma (file) ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "type", type: "string", label: "regular | template" },
    { key: "url", type: "string", label: "Canonical URL" },
    { key: "thumbnailUrl", type: "string", label: "Thumbnail URL" },
    { key: "description", type: "string", label: "Description or preview text" },
    { key: "author", type: "object", label: "{ name, avatarUrl }" },
    { key: "createdTime", type: "string", label: "ISO-8601 created time" },
    { key: "updatedTime", type: "string", label: "ISO-8601 last-modified time" },
    { key: "themeId", type: "string", label: "Applied theme ID" },
    { key: "archived", type: "boolean", label: "Whether the gamma is archived" },
  ],

  execute(input, ctx) {
    return new GammaClient(ctx).request(`/gammas/${encodeURIComponent(input.gammaId)}`);
  },
};

export default getGamma;
