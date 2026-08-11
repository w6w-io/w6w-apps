import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, PodioClient } from "../lib/client.ts";
import { pagingParams, refIdParam, refTypeParam } from "../lib/params.ts";

/**
 * `GET /comment/{type}/{id}/` — "the comments that have been made on an object
 * of the given type and with the given id... sorted in ascending order by time
 * created."
 *
 * Ascending, unlike almost everything else in this API, so the newest comment
 * is the *last* element and a workflow reacting to "the latest comment" wants
 * the tail, not the head. Podio offers no sort parameter here.
 *
 * The reference type vocabulary is polymorphic across Podio's commentable
 * objects. The list offered here is restricted to the ones this app can
 * actually produce an id for, rather than the full internal vocabulary — a
 * dropdown of types that 404 is worse than a short one.
 *
 * Each comment carries `files` (id, name, mimetype, size) but no file content;
 * use Get File for a download link.
 */
interface Input {
  refType: string;
  refId: string;
  limit?: number;
  offset?: number;
}

const COMMENTABLE = ["item", "task", "status", "app", "space", "file"];

const commentList: ActionDefinition<Input> = {
  key: "comment-list",
  type: "read",
  resource: "comment",
  title: "List Comments",
  description:
    "Comments on an item, task or other Podio object, oldest first — so the newest comment " +
    "is the last element, not the first.",
  params: [
    refTypeParam(
      COMMENTABLE,
      "What the comments are attached to. `item` is the common case.",
    ),
    refIdParam(),
    ...pagingParams(100, "Podio's own default is 100."),
  ],
  output: [{ key: "comments", type: "array", label: "Comments, oldest first" }],

  async execute(input, ctx) {
    const comments = await new PodioClient(ctx).json<unknown[]>(
      `/comment/${encodeSegment(input.refType)}/${encodeSegment(input.refId)}/`,
      { query: { limit: input.limit, offset: input.offset } },
    );
    return { comments: comments ?? [] };
  },
};

export default commentList;
