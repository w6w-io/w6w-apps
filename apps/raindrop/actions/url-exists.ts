import type { ActionDefinition } from "@w6w/types";
import { RaindropClient, toList } from "../lib/client.ts";

/**
 * `POST /rest/v1/import/url/exists` — are these URLs already saved?
 *
 * The deduplication check Create Raindrop does not do: Raindrop has no
 * uniqueness constraint on `link`, so "save it if I do not have it" is this call
 * followed by a conditional create.
 *
 * ## `result: false` here means "none found", not "the request failed"
 *
 * The vendor's own two examples:
 *
 *     // Found
 *     {"result": true,  "ids": [3322, 12323]}
 *     // Not found
 *     {"result": false, "ids": []}
 *
 * A perfectly successful "no matches" arrives with `result: false`. This is the
 * one endpoint in the app where the envelope's flag is *data* rather than a
 * verdict, which is why it reads the body with `json()` instead of `ok()` — the
 * shared `ok()` path throws on `result: false`, and doing that here would turn
 * the most common answer into a failed workflow run.
 *
 * The action therefore reports `found` from the **`ids` array**, which is
 * unambiguous, and never from `result`.
 */
interface Input {
  urls: string | string[];
}

const urlExists: ActionDefinition<Input> = {
  key: "url-exists",
  type: "read",
  resource: "import",
  title: "Check URLs Saved",
  description:
    "Check whether URLs are already bookmarked, returning the IDs of the ones that are. Use " +
    "before Create Raindrop — Raindrop does not deduplicate on its own.",
  params: [
    {
      key: "urls",
      label: "URLs",
      type: "string",
      required: true,
      placeholder: "https://example.com/a, https://example.com/b",
      hint: "Comma-separated.",
    },
  ],
  output: [
    { key: "ids", type: "array", label: "IDs of bookmarks that already exist" },
    { key: "found", type: "boolean", label: "Whether any URL was already saved" },
  ],

  async execute(input, ctx) {
    const urls = toList(input.urls);
    if (!urls) throw new Error("URLs is required");

    // `json`, not `ok`: a successful "none of these are saved" comes back as
    // `{"result": false, "ids": []}`, and `ok()` would throw on it.
    const body = await new RaindropClient(ctx).json("/import/url/exists", {
      method: "POST",
      body: { urls },
    });

    const ids = Array.isArray(body.ids) ? body.ids : [];
    return { ids, found: ids.length > 0 };
  },
};

export default urlExists;
