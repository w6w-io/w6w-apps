import type { ActionDefinition } from "@w6w/types";
import { encodeId, RaindropClient } from "../lib/client.ts";
import { raindropIdParam } from "../lib/params.ts";

/**
 * `GET /rest/v1/raindrop/{id}` — one bookmark.
 *
 * **Singular.** `/raindrops/{id}` is a different endpoint: it reads a
 * *collection's* bookmarks, and it will happily interpret a raindrop id as a
 * collection id and return an empty list rather than an error.
 *
 * This is also the endpoint that returns a bookmark's **highlights** — they are
 * a field of the raindrop (`highlights[]`), not a resource with their own read
 * path. The reference documents "Get highlights of raindrop" as this exact call.
 */
interface Input {
  raindropId: number;
}

const raindropGet: ActionDefinition<Input> = {
  key: "raindrop-get",
  type: "read",
  resource: "raindrop",
  title: "Get Raindrop",
  description:
    "Fetch one bookmark by ID, including its highlights, tags, cached-copy status and cover.",
  params: [raindropIdParam],
  output: [{ key: "item", type: "object", label: "Raindrop" }],

  async execute(input, ctx) {
    return { item: await new RaindropClient(ctx).item(`/raindrop/${encodeId(input.raindropId)}`) };
  },
};

export default raindropGet;
