import type { ActionDefinition } from "@w6w/types";
import { encodeId, RaindropClient } from "../lib/client.ts";

/**
 * Ask Raindrop where a bookmark belongs — collections and tags.
 *
 * Two endpoints, one shape, one action:
 *
 *  - **A URL you have not saved yet** → `POST /rest/v1/raindrop/suggest` with
 *    `{link}`.
 *  - **A bookmark that already exists** → `GET /rest/v1/raindrop/{id}/suggest`.
 *
 * Both answer `{result, item: {collections: [{$id}], tags: [string]}}`, so they
 * are one action with an "or" rather than two near-identical ones. Exactly one
 * of the two inputs must be given; supplying both is a request the API has no
 * way to reconcile, so it is refused here rather than silently resolved by
 * precedence.
 *
 * The suggested collections come back as bare `{"$id": n}` references with no
 * titles — resolve them with Get Collection if a human has to read them. And the
 * tag list is a *model's* guess: the vendor's own sample includes
 * `"invalid_parser"`, which is machinery leaking into a suggestion, so anything
 * auto-applying these should filter.
 *
 * Typed `read` despite the POST verb: it creates nothing and changes nothing.
 */
interface Input {
  link?: string;
  raindropId?: number;
}

const raindropSuggest: ActionDefinition<Input> = {
  key: "raindrop-suggest",
  type: "read",
  resource: "raindrop",
  title: "Suggest Collection and Tags",
  description:
    "Ask Raindrop which collections and tags suit a bookmark — either a URL you have not saved " +
    "yet, or one you already have. Give exactly one of the two.",
  params: [
    {
      key: "link",
      label: "URL",
      type: "string",
      placeholder: "https://example.com/article",
      hint: "For a bookmark you have not saved yet. Leave empty if you are using a Raindrop ID.",
    },
    {
      key: "raindropId",
      label: "Raindrop ID",
      type: "number",
      validation: { integer: true },
      hint: "For a bookmark that already exists. Leave empty if you are using a URL.",
    },
  ],
  output: [
    { key: "collections", type: "array", label: "Suggested collections ($id references)" },
    { key: "tags", type: "array", label: "Suggested tags" },
  ],

  async execute(input, ctx) {
    const link = (input.link ?? "").trim();
    const hasId = typeof input.raindropId === "number" && Number.isFinite(input.raindropId);
    if (link && hasId) {
      throw new Error(
        "give either a URL or a Raindrop ID, not both — they are different endpoints",
      );
    }
    if (!link && !hasId) throw new Error("give either a URL or a Raindrop ID");

    const client = new RaindropClient(ctx);
    const item = hasId
      ? await client.item<{ collections?: unknown[]; tags?: string[] }>(
        `/raindrop/${encodeId(input.raindropId!)}/suggest`,
      )
      : await client.item<{ collections?: unknown[]; tags?: string[] }>("/raindrop/suggest", {
        method: "POST",
        body: { link },
      });

    return {
      collections: Array.isArray(item?.collections) ? item.collections : [],
      tags: Array.isArray(item?.tags) ? item.tags : [],
    };
  },
};

export default raindropSuggest;
