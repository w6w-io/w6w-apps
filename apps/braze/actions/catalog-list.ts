import type { ActionDefinition } from "@w6w/types";
import { BrazeClient } from "../lib/client.ts";

/** `GET /catalogs` — verified against the fetched spec. No query parameters. */
const action: ActionDefinition = {
  key: "catalog-list",
  type: "read",
  resource: "catalog",
  title: "List Catalogs",
  description: "List every catalog defined in the workspace, with field schemas and item counts.",
  params: [],
  output: [
    { key: "catalogs", type: "array", label: "Catalogs" },
  ],

  async execute(_input, ctx) {
    return await new BrazeClient(ctx).get("/catalogs");
  },
};

export default action;
