import type { ActionDefinition } from "@w6w/types";
import { compact, ReadwiseClient } from "../lib/client.ts";
import { highlightColorOptions, highlightIdParam, locationHint } from "../lib/params.ts";

/**
 * `PATCH /api/v2/highlights/<id>/` — update one or more fields of an existing
 * highlight.
 *
 * Applying the same patch twice leaves the highlight in the same state, so
 * this is marked `idempotent: true`.
 *
 * Note: the vendor's parameter table lists `location` as type `string` here,
 * unlike Highlight CREATE's `integer` — both plausibly describe the same
 * field (a highlight's position), so this action sends it as a number to
 * match CREATE and what `location_type: "time_offset"` documents (a count of
 * seconds).
 */
interface Input {
  highlightId: string;
  text?: string;
  note?: string;
  location?: number;
  url?: string;
  color?: string;
}

const highlightUpdate: ActionDefinition<Input> = {
  key: "highlight-update",
  type: "perform",
  resource: "highlight",
  title: "Update Highlight",
  description: "Patch one or more fields of an existing highlight.",
  idempotent: true,
  params: [
    highlightIdParam,
    { key: "text", label: "Text", type: "text" },
    { key: "note", label: "Note", type: "text" },
    { key: "location", label: "Location", type: "number", hint: locationHint },
    {
      key: "url",
      label: "URL",
      type: "string",
      hint: "Unique URL of this specific highlight (e.g. a concrete tweet or podcast snippet).",
    },
    { key: "color", label: "Color", type: "select", options: highlightColorOptions },
  ],
  output: [
    { key: "id", type: "number", label: "Highlight ID" },
    { key: "text", type: "string", label: "Text" },
    { key: "note", type: "string", label: "Note" },
    { key: "color", type: "string", label: "Color" },
  ],

  execute(input, ctx) {
    return new ReadwiseClient(ctx).json(`/highlights/${encodeURIComponent(input.highlightId)}/`, {
      method: "PATCH",
      body: compact({
        text: input.text,
        note: input.note,
        location: input.location,
        url: input.url,
        color: input.color,
      }),
    });
  },
};

export default highlightUpdate;
