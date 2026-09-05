import type { ActionDefinition } from "@w6w/types";
import { hnRequest } from "../lib/client.ts";

/**
 * `GET /v0/maxitem.json` — the current largest item id.
 *
 * Per the README: "You can walk backward from here to discover all items." The
 * response body is a bare JSON number, not an object — this action wraps it as
 * `{ id }` for a stable output shape.
 */
const getMaxItemId: ActionDefinition<Record<string, never>, { id: number }> = {
  key: "get-max-item-id",
  type: "read",
  resource: "item",
  title: "Get Max Item ID",
  description: "Fetch the current largest item id, for walking backward through all items.",
  params: [],
  output: [{ key: "id", type: "number", label: "Max item id" }],

  async execute(_input, ctx) {
    const id = await hnRequest<number>(ctx, "/maxitem.json");
    return { id };
  },
};

export default getMaxItemId;
