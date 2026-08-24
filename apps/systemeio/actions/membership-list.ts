import type { ActionDefinition } from "@w6w/types";
import { compact, SystemeClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

interface Input {
  community?: number;
  contact?: number;
  limit?: number;
  startingAfter?: number;
  order?: "asc" | "desc";
}

const membershipList: ActionDefinition<Input> = {
  key: "membership-list",
  type: "read",
  resource: "membership",
  title: "List Community Memberships",
  description: "Retrieve the collection of Membership resources.",
  params: [
    { key: "community", label: "Community ID", type: "number", hint: "Filter by community id." },
    { key: "contact", label: "Contact ID", type: "number", hint: "Filter by contact id." },
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Memberships" },
    { key: "hasMore", type: "boolean", label: "Whether another page is available" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).get("/api/community/memberships", compact({ ...input }));
  },
};

export default membershipList;
