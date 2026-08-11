import type { ActionDefinition } from "@w6w/types";
import { encodeId, RaindropClient } from "../lib/client.ts";
import { highlightColorOptions, raindropIdParam } from "../lib/params.ts";

/**
 * Add a highlight to a bookmark — `PUT /rest/v1/raindrop/{id}` with a
 * `highlights` array.
 *
 * **Highlights have no endpoints of their own for writing.** All three
 * operations — add, update, remove — are the *same* `PUT` on the parent
 * raindrop, distinguished only by what is inside the array element:
 *
 *   | Element                         | Effect  |
 *   | ------------------------------- | ------- |
 *   | `{text, color?, note?}`         | add     |
 *   | `{_id, …fields}`                | update  |
 *   | `{_id, text: ""}`               | **remove** |
 *
 * That is why this app ships three actions over one endpoint rather than one
 * action with a mode switch: the difference between "update the note" and
 * "delete the highlight" is whether `text` happens to be the empty string, and a
 * single form where clearing a field destroys the record is a trap.
 *
 * The array does **not** replace the bookmark's existing highlights: send one
 * element, get one more highlight. The response returns the full `highlights`
 * list, which is the only way to learn the new one's `_id`.
 *
 * Not idempotent — a retry adds a second identical highlight.
 */
interface Input {
  raindropId: number;
  text: string;
  color?: string;
  note?: string;
}

const highlightAdd: ActionDefinition<Input> = {
  key: "highlight-add",
  type: "perform",
  resource: "highlight",
  title: "Add Highlight",
  description:
    "Add a highlight to a bookmark. Existing highlights are kept; the response returns the full " +
    "list, including the new one's ID.",
  idempotent: false,
  params: [
    raindropIdParam,
    {
      key: "text",
      label: "Highlighted text",
      type: "text",
      required: true,
      hint: "The quoted passage. Required — an empty string here is Raindrop's DELETE signal, so " +
        "it is refused.",
    },
    {
      key: "color",
      label: "Colour",
      type: "select",
      options: highlightColorOptions,
      hint: "Yellow when left empty.",
    },
    { key: "note", label: "Note", type: "text", hint: "Your own comment on the passage." },
  ],
  output: [{ key: "highlights", type: "array", label: "All highlights on the bookmark" }],

  async execute(input, ctx) {
    const text = (input.text ?? "").trim();
    // An empty `text` is how Raindrop encodes "remove this highlight". Sending
    // one from the ADD action would be a delete wearing the wrong label.
    if (!text) {
      throw new Error(
        "Highlighted text is required — Raindrop reads an empty `text` as a delete instruction",
      );
    }

    const highlight: Record<string, unknown> = { text };
    if (input.color) highlight.color = input.color;
    if (input.note !== undefined && input.note !== "") highlight.note = input.note;

    const item = await new RaindropClient(ctx).item<{ highlights?: unknown[] }>(
      `/raindrop/${encodeId(input.raindropId)}`,
      { method: "PUT", body: { highlights: [highlight] } },
    );
    return { highlights: Array.isArray(item?.highlights) ? item.highlights : [] };
  },
};

export default highlightAdd;
