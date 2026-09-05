import type { ActionDefinition } from "@w6w/types";
import { GoogleAdminClient } from "../lib/client.ts";

interface Input {
  customerId?: string;
  orgUnitPath?: string;
  type?: string;
}

const listOrgUnits: ActionDefinition<Input> = {
  key: "orgunit-list",
  type: "search",
  resource: "orgunit",
  title: "List Org Units",
  description: "List organizational units under a path.",
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      default: "my_customer",
      hint: "`my_customer` refers to the connected account's own Workspace customer.",
    },
    {
      key: "orgUnitPath",
      label: "Org Unit Path",
      type: "string",
      default: "/",
      hint: "Returns children of this org unit. Defaults to the root.",
    },
    {
      key: "type",
      label: "Scope",
      type: "select",
      options: [
        { value: "all", label: "All sub-organizations" },
        { value: "children", label: "Immediate children only" },
        { value: "allIncludingParent", label: "All, including the parent" },
      ],
      default: "children",
    },
  ],

  execute(input, ctx) {
    const client = new GoogleAdminClient(ctx);
    return client.request(
      `/customer/${encodeURIComponent(input.customerId ?? "my_customer")}/orgunits`,
      {
        query: {
          orgUnitPath: input.orgUnitPath ?? "/",
          type: input.type ?? "children",
        },
      },
    );
  },
};

export default listOrgUnits;
