import type { ActionDefinition } from "@w6w/types";
import { asJson, RaindropClient } from "../lib/client.ts";

/**
 * `POST /rest/v1/raindrops` — save up to 100 bookmarks in one call.
 *
 * **Plural**, and the body is `{items: [...]}` where each element has the same
 * shape as a single create — not a bare array, and not the single-create body
 * repeated.
 *
 * **"Maximum 100 objects in array!"** is the vendor's own emphasis. The ceiling
 * is enforced here so an oversized batch fails before the request instead of
 * after it, with a message that says how many were given.
 *
 * The items are a free-form `json` param rather than a generated form because
 * the element shape is the create body (`link` required; `title`, `excerpt`,
 * `note`, `tags`, `collection`, `pleaseParse`, …) and a repeating form of
 * thirteen fields is unusable next to pasting the array a previous step
 * produced. `link` is checked on every element for the same reason the single
 * create checks it: a batch that silently drops elements is worse than one that
 * refuses.
 *
 * Not idempotent, for the same reason as the single create: no idempotency key,
 * no deduplication on `link`.
 */
interface Input {
  items: unknown;
}

/** The vendor's documented ceiling. */
export const MAX_ITEMS = 100;

const raindropCreateMany: ActionDefinition<Input> = {
  key: "raindrop-create-many",
  type: "perform",
  resource: "raindrop",
  title: "Create Raindrops",
  description:
    "Save up to 100 bookmarks in one call. Each item takes the same fields as Create Raindrop " +
    "and must have a `link`.",
  idempotent: false,
  params: [
    {
      key: "items",
      label: "Items",
      type: "json",
      required: true,
      hint: 'A JSON array, max 100 elements, each like {"link": "https://…", "title": "…", ' +
        '"tags": ["a"], "collection": {"$id": 123}}. Only `link` is required per item.',
    },
  ],
  output: [{ key: "items", type: "array", label: "Created raindrops" }],

  async execute(input, ctx) {
    const items = asJson<unknown[]>(input.items, "Items");
    if (!Array.isArray(items)) throw new Error("Items must be a JSON array");
    if (items.length === 0) throw new Error("Items is empty");
    if (items.length > MAX_ITEMS) {
      throw new Error(
        `Raindrop accepts at most ${MAX_ITEMS} items per call; ${items.length} were given`,
      );
    }
    for (const [i, item] of items.entries()) {
      const link = (item as { link?: unknown } | null)?.link;
      if (typeof link !== "string" || link.trim() === "") {
        throw new Error(`Items[${i}] has no \`link\` — every raindrop needs a URL`);
      }
    }

    return {
      items: await new RaindropClient(ctx).items("/raindrops", { method: "POST", body: { items } }),
    };
  },
};

export default raindropCreateMany;
