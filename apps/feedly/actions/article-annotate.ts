import type { ActionDefinition } from "@w6w/types";
import { FeedlyClient } from "../lib/client.ts";

/**
 * `POST /v3/annotations` — add a comment (and optionally a text highlight) to
 * an article.
 *
 * Verified against the "Annotate articles" reference page (fetched
 * 2026-09-06): `servers: ["https://api.feedly.com/v3/annotations"]`, path
 * `/`. The page's own field table documents `entryId` and `comment`
 * ("HTML tags will be stripped"); the worked request body additionally shows
 * an optional `highlight: {version, start, end, text}` object, which this
 * action exposes but does not require.
 *
 * Not marked idempotent: nothing in the documented response ties a repeated
 * call with the same `entryId`/`comment` to the same annotation, so retrying
 * risks posting the same comment twice.
 */

interface Input {
  entryId: string;
  comment: string;
  highlightStart?: number;
  highlightEnd?: number;
  highlightText?: string;
}

const articleAnnotate: ActionDefinition<Input> = {
  key: "article-annotate",
  type: "perform",
  resource: "annotations",
  title: "Annotate Article",
  description: "Add a comment, and optionally a text highlight, to an article.",
  idempotent: false,
  params: [
    { key: "entryId", label: "Entry ID", type: "string", required: true },
    {
      key: "comment",
      label: "Comment",
      type: "text",
      required: true,
      hint: "HTML tags are stripped by Feedly.",
    },
    {
      key: "highlightStart",
      label: "Highlight start offset",
      type: "number",
      advanced: true,
    },
    {
      key: "highlightEnd",
      label: "Highlight end offset",
      type: "number",
      advanced: true,
    },
    {
      key: "highlightText",
      label: "Highlighted text",
      type: "string",
      advanced: true,
      hint: "The literal substring being highlighted, matching the start/end offsets.",
    },
  ],
  output: [],

  async execute(input, ctx) {
    const hasHighlight = input.highlightStart !== undefined && input.highlightEnd !== undefined &&
      !!input.highlightText;
    await new FeedlyClient(ctx).json("/v3/annotations", {
      method: "POST",
      body: {
        entryId: input.entryId,
        comment: input.comment,
        ...(hasHighlight
          ? {
            highlight: {
              version: 1,
              start: input.highlightStart,
              end: input.highlightEnd,
              text: input.highlightText,
            },
          }
          : {}),
      },
    });
    return {};
  },
};

export default articleAnnotate;
