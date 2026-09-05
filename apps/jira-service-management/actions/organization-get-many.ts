import type { ActionDefinition } from "@w6w/types";
import { JsmClient, unset } from "../lib/client.ts";
import { pagedOutput, pagination } from "../lib/params.ts";

interface Input {
  accountId?: string;
  limit?: number;
  start?: number;
}

const organizationGetMany: ActionDefinition<Input> = {
  key: "organization-get-many",
  type: "search",
  resource: "organization",
  title: "List Organizations",
  description: "List organizations, optionally filtered to those a customer account belongs to.",
  params: [
    {
      key: "accountId",
      label: "Customer account ID",
      type: "string",
      advanced: true,
      hint: "Filters to organizations this customer is a member of. Requires an agent license.",
    },
    ...pagination,
  ],
  output: pagedOutput,

  execute(input, ctx) {
    return new JsmClient(ctx).request("/organization", {
      query: {
        accountId: unset(input.accountId),
        start: input.start ?? 0,
        limit: input.limit ?? 50,
      },
    });
  },
};

export default organizationGetMany;
