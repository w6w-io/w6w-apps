import type { ActionDefinition } from "@w6w/types";
import { ReadwiseClient } from "../lib/client.ts";
import { highlightIdParam } from "../lib/params.ts";

/** `GET /api/v2/highlights/<id>/` — read one highlight by id. No parameters beyond the id. */
interface Input {
  highlightId: string;
}

const highlightGet: ActionDefinition<Input> = {
  key: "highlight-get",
  type: "read",
  resource: "highlight",
  title: "Get Highlight",
  description: "Read a specific highlight by id.",
  params: [highlightIdParam],
  output: [
    { key: "id", type: "number", label: "Highlight ID" },
    { key: "text", type: "string", label: "Text" },
    { key: "note", type: "string", label: "Note" },
    { key: "color", type: "string", label: "Color" },
    { key: "book_id", type: "number", label: "Book ID" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "readwise_url", type: "string", label: "Readwise URL" },
  ],

  execute(input, ctx) {
    return new ReadwiseClient(ctx).json(`/highlights/${encodeURIComponent(input.highlightId)}/`);
  },
};

export default highlightGet;
