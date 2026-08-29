import type { ActionDefinition } from "@w6w/types";
import { compact, ReadwiseClient } from "../lib/client.ts";
import { highlightCategoryOptions, locationHint, locationTypeOptions } from "../lib/params.ts";

/**
 * `POST /api/v2/highlights/` — save a highlight to the user's Readwise account.
 *
 * The vendor's own framing: "If you want to save highlights to a user's
 * Readwise account from your own application, this is the only endpoint you
 * should need." The endpoint technically accepts an array of highlight
 * objects in one call; this action sends exactly one, matching the
 * one-operation shape of every other Action here — chain a loop upstream to
 * create several.
 *
 * ## Genuinely safe to retry
 *
 * Readwise's own doc: "we de-dupe highlights by title/author/text/source_url.
 * So if you send a highlight with those 4 things the same (including nulls)
 * then it will do nothing rather than create a 'duplicate'." That is retry
 * safety stated by the vendor, not assumed — hence `idempotent: true`. The
 * same endpoint doubles as an update: passing the same `highlight_url` again
 * with new `text` updates that highlight's text instead of creating another.
 *
 * ## Response shape
 *
 * A `200` with a list of the book/article/podcast objects touched (title,
 * author, category, `highlights_url`, and — the field that matters for
 * chaining — `modified_highlights`, the ids Readwise created or updated for
 * *this* request). Since exactly one highlight was sent, `books` holds at
 * most one entry; `highlightId` lifts its first modified id for convenience,
 * since almost every next step (tagging, updating, reading) needs it.
 */
interface Input {
  text: string;
  title?: string;
  author?: string;
  imageUrl?: string;
  sourceUrl?: string;
  sourceType?: string;
  category?: string;
  note?: string;
  location?: number;
  locationType?: string;
  highlightedAt?: string;
  highlightUrl?: string;
}

interface CreatedBook {
  id: number;
  modified_highlights?: number[];
  [key: string]: unknown;
}

const highlightCreate: ActionDefinition<Input> = {
  key: "highlight-create",
  type: "perform",
  resource: "highlight",
  title: "Create Highlight",
  description: "Save a highlight to the user's Readwise account. De-duped by Readwise itself.",
  idempotent: true,
  params: [
    {
      key: "text",
      label: "Text",
      type: "text",
      required: true,
      validation: { maxLength: 8191 },
      hint: "The highlight text — the only field Readwise requires.",
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      validation: { maxLength: 511 },
      hint:
        'Title of the book/article/podcast. Omit and Readwise files it under a generic "Quotes" ' +
        "book.",
    },
    {
      key: "author",
      label: "Author",
      type: "string",
      validation: { maxLength: 1024 },
    },
    {
      key: "imageUrl",
      label: "Cover image URL",
      type: "string",
      validation: { maxLength: 2047 },
    },
    {
      key: "sourceUrl",
      label: "Source URL",
      type: "string",
      validation: { maxLength: 2047 },
      hint: "URL of the article/podcast this highlight is from.",
    },
    {
      key: "sourceType",
      label: "Source type",
      type: "string",
      validation: { maxLength: 64, minLength: 3 },
      placeholder: "my_app",
      hint: "A unique identifier for your app, 3–64 characters, no spaces.",
    },
    {
      key: "category",
      label: "Category",
      type: "select",
      options: highlightCategoryOptions,
      hint: "Defaults to articles (if a source URL is set) or books otherwise.",
    },
    {
      key: "note",
      label: "Note",
      type: "text",
      validation: { maxLength: 8191 },
      hint: "Annotation attached to this highlight. Inline tags work here too, but Readwise does " +
        "not recreate a tag once it has been deleted.",
    },
    {
      key: "location",
      label: "Location",
      type: "number",
      hint: locationHint,
    },
    {
      key: "locationType",
      label: "Location type",
      type: "select",
      options: locationTypeOptions,
      default: "order",
    },
    {
      key: "highlightedAt",
      label: "Highlighted at",
      type: "datetime",
      hint: "ISO 8601, e.g. 2020-07-14T20:11:24+00:00. Defaults to UTC.",
    },
    {
      key: "highlightUrl",
      label: "Highlight URL",
      type: "string",
      validation: { maxLength: 4095 },
      hint:
        "Unique URL of this specific highlight (a tweet, a podcast snippet). Passing the same " +
        "URL again with new text updates that highlight instead of creating another.",
    },
  ],
  output: [
    { key: "books", type: "array", label: "Books touched by this request" },
    { key: "highlightId", type: "number", label: "ID of the created/updated highlight" },
  ],

  async execute(input, ctx) {
    const highlight = compact({
      text: input.text,
      title: input.title,
      author: input.author,
      image_url: input.imageUrl,
      source_url: input.sourceUrl,
      source_type: input.sourceType,
      category: input.category,
      note: input.note,
      location: input.location,
      location_type: input.locationType,
      highlighted_at: input.highlightedAt,
      highlight_url: input.highlightUrl,
    });

    const books = await new ReadwiseClient(ctx).json<CreatedBook[]>("/highlights/", {
      method: "POST",
      body: { highlights: [highlight] },
    });

    return { books, highlightId: books?.[0]?.modified_highlights?.[0] };
  },
};

export default highlightCreate;
