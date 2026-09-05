import type { ActionDefinition } from "@w6w/types";
import { GoogleAdminClient } from "../lib/client.ts";

interface Input {
  customerId?: string;
  name: string;
  parentOrgUnitPath: string;
  description?: string;
}

const insertOrgUnit: ActionDefinition<Input> = {
  key: "orgunit-insert",
  type: "perform",
  resource: "orgunit",
  title: "Create Org Unit",
  description: "Create a new organizational unit under a parent path.",
  idempotent: false,
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      default: "my_customer",
      hint: "`my_customer` refers to the connected account's own Workspace customer.",
    },
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "parentOrgUnitPath",
      label: "Parent Org Unit Path",
      type: "string",
      required: true,
      default: "/",
      hint: "e.g. `/` for the top level, or `/Sales` to nest under Sales.",
    },
    { key: "description", label: "Description", type: "text" },
  ],

  execute(input, ctx) {
    const client = new GoogleAdminClient(ctx);
    const customerId = encodeURIComponent(input.customerId ?? "my_customer");
    const body: Record<string, unknown> = {
      name: input.name,
      parentOrgUnitPath: input.parentOrgUnitPath,
    };
    if (input.description !== undefined) body.description = input.description;
    return client.request(`/customer/${customerId}/orgunits`, { method: "POST", body });
  },
};

export default insertOrgUnit;
