import type { ActionDefinition } from "@w6w/types";
import { FolkClient, networkPath } from "../lib/client.ts";

interface NetworkMember {
  id: string;
  fullName: string;
  email: string;
}

/**
 * `GET /network/{networkId}/users` — labelled "List Members" in folk's own
 * reference sidebar (`operationId: listUsers`). Returns the folk TEAMMATES
 * who are logged into this network, not the network's CRM contacts — see
 * `lib/client.ts` for why that distinction matters. Named
 * `list-network-members` here, deliberately not `list-users`, to keep it
 * from being reached for by mistake instead of `person-*`. Not paginated.
 */
const listNetworkMembers: ActionDefinition<Record<string, never>> = {
  key: "list-network-members",
  type: "read",
  resource: "network-member",
  title: "List Network Members",
  description: "List the folk teammates who have access to this network (NOT CRM contacts — " +
    "see person-* actions for those).",
  params: [],
  output: [{ key: "members", type: "array", label: "Members" }],

  async execute(_input, ctx) {
    const members = await new FolkClient(ctx).request<NetworkMember[]>(networkPath("/users"));
    return { members };
  },
};

export default listNetworkMembers;
