import type { ActionDefinition } from "@w6w/types";
import { AffinityClient } from "../lib/client.ts";

/**
 * `GET /lists` — every list visible to this API key. No pagination, no
 * query parameters; the docs state "Parameters: None".
 */
interface Output {
  id: number;
  type: number;
  name: string;
  public: boolean;
  owner_id: number;
  list_size: number;
}

const listsList: ActionDefinition<Record<string, never>> = {
  key: "lists-list",
  type: "read",
  resource: "list",
  title: "List Lists",
  description: "Get every List visible to this API key.",
  params: [],
  output: [{ key: "lists", type: "array", label: "Lists" }],

  execute(_input, ctx) {
    return new AffinityClient(ctx).json<Output[]>("/lists");
  },
};

export default listsList;
