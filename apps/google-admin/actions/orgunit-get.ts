import type { ActionDefinition } from "@w6w/types";
import { encodeOrgUnitPath, GoogleAdminClient } from "../lib/client.ts";

interface Input {
  customerId?: string;
  orgUnitPath: string;
}

const getOrgUnit: ActionDefinition<Input> = {
  key: "orgunit-get",
  type: "read",
  resource: "orgunit",
  title: "Get Org Unit",
  description: "Retrieve one organizational unit by path or unique ID.",
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
      required: true,
      hint: "e.g. `Sales/Support` or `/Sales/Support`.",
    },
  ],

  execute(input, ctx) {
    const client = new GoogleAdminClient(ctx);
    const customerId = encodeURIComponent(input.customerId ?? "my_customer");
    return client.request(
      `/customer/${customerId}/orgunits/${encodeOrgUnitPath(input.orgUnitPath)}`,
    );
  },
};

export default getOrgUnit;
