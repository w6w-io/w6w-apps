import type { ActionDefinition } from "@w6w/types";
import { InstapaperClient, type InstapaperHighlight } from "../lib/client.ts";

/**
 * `POST /api/1.1/bookmarks/<bookmark-id>/highlight` — create a highlight.
 *
 * Docs: HTML tags in `text` should be unescaped, and non-subscribers are
 * limited to 5 highlights per month (the documented `1600`/`1601` errors
 * cover empty text and an exact duplicate). Not idempotent — this creates a
 * new resource each call.
 */
interface Input {
  bookmarkId: number;
  text: string;
  position?: number;
}

const highlightsCreate: ActionDefinition<Input> = {
  key: "highlights-create",
  type: "perform",
  resource: "highlight",
  title: "Create Highlight",
  description: "Create a highlight on a bookmark. Non-subscribers are limited to 5 per month.",
  idempotent: false,
  params: [
    { key: "bookmarkId", label: "Bookmark ID", type: "number", required: true },
    {
      key: "text",
      label: "Text",
      type: "text",
      required: true,
      hint: "HTML tags should be left unescaped.",
    },
    {
      key: "position",
      label: "Position",
      type: "number",
      default: 0,
      hint: "0-indexed position of the text within the content. Defaults to 0.",
    },
  ],
  output: [
    { key: "highlight_id", type: "number", label: "Highlight id" },
    { key: "bookmark_id", type: "number", label: "Bookmark id" },
  ],

  async execute(input, ctx) {
    const [highlight] = await new InstapaperClient(ctx).call<InstapaperHighlight>(
      `/api/1.1/bookmarks/${encodeURIComponent(String(input.bookmarkId))}/highlight`,
      { text: input.text, position: input.position },
    );
    if (!highlight) throw new Error("Instapaper returned no highlight");
    return highlight;
  },
};

export default highlightsCreate;
