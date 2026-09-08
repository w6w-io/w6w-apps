import type { ActionDefinition } from "@w6w/types";
import { FolkClient, networkPath } from "../lib/client.ts";

interface Group {
  id: string;
  networkId: string;
  name: string;
}

/**
 * `GET /network/{networkId}/groups` — a folk "group" is a contact list
 * (people/companies live under one). Not paginated; returns every group in
 * one array. Usually the first call in a workflow that needs a `groupId` for
 * `person-create`/`company-create`/etc.
 */
const listGroups: ActionDefinition<Record<string, never>> = {
  key: "list-groups",
  type: "read",
  resource: "group",
  title: "List Groups",
  description: "List the contact-list groups on this network.",
  params: [],
  output: [{ key: "groups", type: "array", label: "Groups" }],

  async execute(_input, ctx) {
    const groups = await new FolkClient(ctx).request<Group[]>(networkPath("/groups"));
    return { groups };
  },
};

export default listGroups;
