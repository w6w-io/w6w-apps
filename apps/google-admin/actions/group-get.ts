import type { ActionDefinition } from "@w6w/types";
import { GoogleAdminClient } from "../lib/client.ts";

interface Input {
  groupKey: string;
}

const getGroup: ActionDefinition<Input> = {
  key: "group-get",
  type: "read",
  resource: "group",
  title: "Get Group",
  description: "Retrieve a group by email address or unique ID.",
  params: [
    { key: "groupKey", label: "Group Key", type: "string", required: true },
  ],

  execute(input, ctx) {
    const client = new GoogleAdminClient(ctx);
    return client.request(`/groups/${encodeURIComponent(input.groupKey)}`);
  },
};

export default getGroup;
