import type { ActionDefinition } from "@w6w/types";
import { deskList, type DeskListEnvelope, type DeskListInput } from "../lib/desk.ts";
import { orgId, pageParams } from "../lib/params.ts";

interface Input extends DeskListInput {
  sortBy?: string;
}

const accountList: ActionDefinition<Input, DeskListEnvelope<Record<string, unknown>>> = {
  key: "account-list",
  type: "read",
  resource: "account",
  title: "List Accounts",
  description: "List accounts (customer companies), with pagination support.",
  params: [
    orgId,
    {
      key: "sortBy",
      label: "Sort by",
      type: "string",
      hint: "accountName or createdTime. Prefix with - for descending.",
    },
    ...pageParams,
  ],
  output: [{ key: "data", type: "array", label: "Accounts" }],

  execute(input, ctx) {
    return deskList(ctx, "/accounts", input, { sortBy: input.sortBy });
  },
};

export default accountList;
