import type { ActionDefinition } from "@w6w/types";
import { encodeId, RaindropClient } from "../lib/client.ts";
import { highlightColorOptions, raindropIdParam } from "../lib/params.ts";

/**
 * Edit an existing highlight — `PUT /rest/v1/raindrop/{id}` with
 * `{highlights: [{_id, …changed fields}]}`.
 *
 * The element is matched by `_id` (the 24-character hex from List Highlights or
 * Get Raindrop) and only the fields present are changed.
 *
 * **`text` is deliberately not writable from this action.** Setting `text` to
 * the empty string is how Raindrop *deletes* a highlight, and the whole point of
 * splitting these three actions is that an edit form must not be able to destroy
 * the record by clearing a box. Re-wording a highlight means removing it and
 * adding it again — which is also what the vendor's own field table implies,
 * since it lists `highlights[].text` on the update body as "Should be empty
 * string".
 *
 * Idempotent: setting the same note and colour twice converges on the same state.
 */
interface Input {
  raindropId: number;
  highlightId: string;
  color?: string;
  note?: string;
}

const highlightUpdate: ActionDefinition<Input> = {
  key: "highlight-update",
  type: "perform",
  resource: "highlight",
  title: "Update Highlight",
  description:
    "Change an existing highlight's colour or note. The highlighted text itself is not editable " +
    "here — an empty `text` is Raindrop's delete signal.",
  idempotent: true,
  params: [
    raindropIdParam,
    {
      key: "highlightId",
      label: "Highlight ID",
      type: "string",
      required: true,
      placeholder: "62388e9e48b63606f41e44a6",
      hint: "The `_id` of the highlight, from List Highlights or Get Raindrop.",
    },
    { key: "color", label: "Colour", type: "select", options: highlightColorOptions },
    {
      key: "note",
      label: "Note",
      type: "text",
      hint: "Replaces the existing note. An empty note is allowed here — only an empty *text* " +
        "field deletes a highlight, and this action never sends one.",
    },
  ],
  output: [{ key: "highlights", type: "array", label: "All highlights on the bookmark" }],

  async execute(input, ctx) {
    const highlightId = (input.highlightId ?? "").trim();
    if (!highlightId) throw new Error("Highlight ID is required");

    const highlight: Record<string, unknown> = { _id: highlightId };
    if (input.color) highlight.color = input.color;
    if (input.note !== undefined) highlight.note = input.note;
    if (Object.keys(highlight).length === 1) {
      throw new Error("nothing to update — set a colour or a note");
    }

    const item = await new RaindropClient(ctx).item<{ highlights?: unknown[] }>(
      `/raindrop/${encodeId(input.raindropId)}`,
      { method: "PUT", body: { highlights: [highlight] } },
    );
    return { highlights: Array.isArray(item?.highlights) ? item.highlights : [] };
  },
};

export default highlightUpdate;
