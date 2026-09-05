import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Heartbeat actions.
 *
 * Every field name, type and requiredness here is copied from Heartbeat's
 * OpenAPI 3.0 document (embedded in `https://heartbeat.readme.io/reference/*`,
 * fetched 2026-09-05, `info.version` `1.0.0`), not inferred.
 */

/** A resource id, addressed by Heartbeat's own `format: uuid` path parameter. */
export function idParam(key: string, label: string, hint?: string): Param {
  return { key, label, type: "string", required: true, hint };
}

/** An email address, Heartbeat's own user-lookup key for most write endpoints. */
export function emailParam(key: string, label: string, required: boolean, hint?: string): Param {
  return { key, label, type: "string", required, hint: hint ?? "A user's email address." };
}

/**
 * Heartbeat's rich-text note, attached to every `text` param this app exposes.
 *
 * Documented on the "Rich Text" reference page: only `<p>`, `<a>`, `<b>`,
 * `<h1>`-`<h3>`, `<ul>`, `<li>`, `<br>` survive — everything else is silently
 * removed, and only `<a>`'s `href` attribute survives. Not Markdown, and not
 * plain text either: a caller who sends `# Heading` gets a literal `#
 * Heading` paragraph, not a rendered heading.
 */
export const RICH_TEXT_HINT = "Restricted HTML, not Markdown: only <p>, <a>, <b>, <h1>-<h3>, " +
  "<ul>, <li>, <br> survive — every other tag is stripped, and only <a>'s href attribute is " +
  'kept. Mention a user or group with "@<their id>" as literal inline text.';

/**
 * The `startingAfter`/`limit` cursor pair shared by `getChatChannelMessages`
 * and `getDocuments`.
 *
 * **The two endpoints do NOT answer the same shape.** `getChatChannelMessages`
 * wraps its page in `{data, hasMore}`; `getDocuments` answers a bare array
 * with no `hasMore` at all, so a caller paging documents has no signal for
 * "is there another page?" beyond "did I get exactly `limit` items back?" —
 * which is silently wrong the one time the total is an exact multiple of the
 * page size. See `lib/client.ts` finding 1.
 */
export function cursorParams(defaultLimit = 50): Param[] {
  return [
    {
      key: "startingAfter",
      label: "Starting after (cursor)",
      type: "string",
      hint:
        "The id of the last item from a previous page. Leave empty to start from the beginning.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: defaultLimit,
      validation: { integer: true, min: 1, max: 100 },
      hint: "1-100. Heartbeat's own default is 50.",
    },
  ];
}
