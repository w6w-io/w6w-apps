import type { ActionDefinition } from "@w6w/types";
import { encodeId, RaindropClient } from "../lib/client.ts";
import { raindropIdParam } from "../lib/params.ts";

/**
 * Delete a highlight — `PUT /rest/v1/raindrop/{id}` with
 * `{highlights: [{_id, text: ""}]}`.
 *
 * **There is no DELETE.** Removing a highlight is a `PUT` on the parent bookmark
 * whose array element carries the highlight's `_id` and an **empty `text`**.
 * That is the entire encoding, and it is the reason this app has a separate
 * action for it: nothing about the request says "delete", so a generic
 * highlight-editing form that let a user clear the text box would destroy the
 * record and report success.
 *
 * The empty string is written as a literal here and is not reachable from any
 * input, so this action can only ever delete the highlight it was given.
 *
 * Idempotent: removing an already-removed highlight converges on the same state.
 */
interface Input {
  raindropId: number;
  highlightId: string;
}

const highlightRemove: ActionDefinition<Input> = {
  key: "highlight-remove",
  type: "perform",
  resource: "highlight",
  title: "Remove Highlight",
  description:
    "Delete one highlight from a bookmark. Raindrop has no DELETE for highlights — this is a PUT " +
    "carrying the highlight's ID and an empty text field.",
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
  ],
  output: [{ key: "highlights", type: "array", label: "Remaining highlights on the bookmark" }],

  async execute(input, ctx) {
    const highlightId = (input.highlightId ?? "").trim();
    if (!highlightId) throw new Error("Highlight ID is required");

    const item = await new RaindropClient(ctx).item<{ highlights?: unknown[] }>(
      `/raindrop/${encodeId(input.raindropId)}`,
      // The empty `text` IS the delete instruction. It is a literal, not a
      // pass-through of anything the caller supplied.
      { method: "PUT", body: { highlights: [{ _id: highlightId, text: "" }] } },
    );
    return { highlights: Array.isArray(item?.highlights) ? item.highlights : [] };
  },
};

export default highlightRemove;
