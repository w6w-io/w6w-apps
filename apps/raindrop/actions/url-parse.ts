import type { ActionDefinition } from "@w6w/types";
import { RaindropClient } from "../lib/client.ts";

/**
 * `GET /rest/v1/import/url/parse` — extract title, description, cover and type
 * from any URL, without saving anything.
 *
 * Raindrop's own page parser, exposed as a lookup. Useful on its own (enrich a
 * link before deciding what to do with it) and as a dry run before Create
 * Raindrop.
 *
 * ## `result: true` alongside an `error` is the normal failure shape
 *
 * This endpoint reports a page it could not read *inside a successful response*.
 * The reference's own examples:
 *
 *     // invalid URL
 *     {"error": "not_found", "errorMessage": "invalid_url",
 *      "item": {…}, "result": true}
 *
 *     // page 404s
 *     {"error": "not_found", "errorMessage": "url_status_404",
 *      "item": {…}, "result": true}
 *
 * `result` is **true** in both, and `item` is still populated — with a fallback
 * built from the URL itself and `parser: "local"`. So the vendor is saying "here
 * is the best I could do, and here is why it is not much", which is data, not an
 * error.
 *
 * That is why this action reads the body with `json()` rather than `ok()` and
 * surfaces `error` / `errorMessage` as **output fields** instead of throwing.
 * A caller that wants strictness checks `parseError` and decides; a caller that
 * just wants a title gets one either way. Throwing here would turn "that page is
 * down" into a failed workflow run.
 */
interface Input {
  url: string;
}

const urlParse: ActionDefinition<Input> = {
  key: "url-parse",
  type: "read",
  resource: "import",
  title: "Parse URL",
  description:
    "Extract title, description, cover image and type from any URL using Raindrop's parser, " +
    "without saving it. A page that cannot be read still returns a best-effort item plus a " +
    "`parseError`.",
  params: [
    {
      key: "url",
      label: "URL",
      type: "string",
      required: true,
      placeholder: "https://example.com/article",
    },
  ],
  output: [
    { key: "item", type: "object", label: "Parsed metadata" },
    { key: "parseError", type: "string", label: "Parser error code, if any" },
    { key: "parseErrorMessage", type: "string", label: "Parser error detail, if any" },
  ],

  async execute(input, ctx) {
    const url = (input.url ?? "").trim();
    if (!url) throw new Error("URL is required");

    // `json`, not `ok`: this endpoint reports an unreadable page inside a
    // `result: true` body, and that is an answer rather than a failure.
    const body = await new RaindropClient(ctx).json(`/import/url/parse`, { query: { url } });

    return {
      item: body.item ?? {},
      parseError: body.error === undefined || body.error === null ? undefined : String(body.error),
      parseErrorMessage: body.errorMessage,
    };
  },
};

export default urlParse;
