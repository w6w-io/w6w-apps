import type { ActionDefinition } from "@w6w/types";
import { hnRequest, type Item } from "../lib/client.ts";

/**
 * `GET /v0/item/{id}.json` — a story, comment, job, poll, or poll option.
 *
 * A bogus or deleted id still answers `200 null` (see `lib/client.ts`'s module
 * doc) — this action returns that `null` through unchanged rather than
 * throwing, since the vendor itself treats it as a normal, well-formed answer.
 */
interface Input {
  id: number;
}

const getItem: ActionDefinition<Input, Item | null> = {
  key: "get-item",
  type: "read",
  resource: "item",
  title: "Get Item",
  description: "Fetch a story, comment, job, poll, or poll option by its numeric id.",
  params: [
    {
      key: "id",
      label: "Item ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "The item's unique integer id, e.g. from a story-id list or another item's kids.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Item ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "type", type: "string", label: "Type (job, story, comment, poll, pollopt)" },
    { key: "by", type: "string", label: "Author username" },
    { key: "time", type: "number", label: "Created (Unix time)" },
    { key: "text", type: "string", label: "Text (HTML)" },
    { key: "dead", type: "boolean", label: "Dead" },
    { key: "parent", type: "number", label: "Parent item id (comments)" },
    { key: "poll", type: "number", label: "Associated poll id (pollopts)" },
    { key: "kids", type: "array", label: "Comment ids, in ranked display order" },
    { key: "url", type: "string", label: "Story URL" },
    { key: "score", type: "number", label: "Score (stories) or votes (pollopts)" },
    { key: "title", type: "string", label: "Title (HTML)" },
    { key: "parts", type: "array", label: "Related pollopt ids (polls)" },
    { key: "descendants", type: "number", label: "Total comment count (stories, polls)" },
  ],

  execute(input, ctx) {
    return hnRequest<Item | null>(ctx, `/item/${input.id}.json`);
  },
};

export default getItem;
