import type { ActionDefinition } from "@w6w/types";
import { encodeOrgUnitPath, GoogleAdminClient } from "../lib/client.ts";

interface Input {
  customerId?: string;
  orgUnitPath: string;
}

const deleteOrgUnit: ActionDefinition<Input> = {
  key: "orgunit-delete",
  type: "perform",
  resource: "orgunit",
  title: "Delete Org Unit",
  description: "Permanently delete an organizational unit. It must have no child org units.",
  idempotent: true,
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      default: "my_customer",
      hint: "`my_customer` refers to the connected account's own Workspace customer.",
    },
    { key: "orgUnitPath", label: "Org Unit Path", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new GoogleAdminClient(ctx);
    const customerId = encodeURIComponent(input.customerId ?? "my_customer");
    await client.request(
      `/customer/${customerId}/orgunits/${encodeOrgUnitPath(input.orgUnitPath)}`,
      { method: "DELETE" },
    );
    return { orgUnitPath: input.orgUnitPath, success: true };
  },
};

export default deleteOrgUnit;
