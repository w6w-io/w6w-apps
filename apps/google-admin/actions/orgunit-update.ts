import type { ActionDefinition } from "@w6w/types";
import { encodeOrgUnitPath, GoogleAdminClient } from "../lib/client.ts";

interface Input {
  customerId?: string;
  orgUnitPath: string;
  name?: string;
  parentOrgUnitPath?: string;
  description?: string;
}

const updateOrgUnit: ActionDefinition<Input> = {
  key: "orgunit-update",
  type: "perform",
  resource: "orgunit",
  title: "Update Org Unit",
  description: "Patch an organizational unit's fields. Only the fields supplied are changed.",
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
    { key: "name", label: "Name", type: "string" },
    {
      key: "parentOrgUnitPath",
      label: "New Parent Org Unit Path",
      type: "string",
      hint: "Moves the org unit under a different parent.",
    },
    { key: "description", label: "Description", type: "text" },
  ],

  execute(input, ctx) {
    const client = new GoogleAdminClient(ctx);
    const customerId = encodeURIComponent(input.customerId ?? "my_customer");
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.parentOrgUnitPath !== undefined) body.parentOrgUnitPath = input.parentOrgUnitPath;
    if (input.description !== undefined) body.description = input.description;
    return client.request(
      `/customer/${customerId}/orgunits/${encodeOrgUnitPath(input.orgUnitPath)}`,
      { method: "PATCH", body },
    );
  },
};

export default updateOrgUnit;
