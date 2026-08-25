import type { ActionDefinition } from "@w6w/types";
import { deskGet, type DeskGetInput } from "../lib/desk.ts";
import { orgId, recordId } from "../lib/params.ts";

interface Input extends DeskGetInput {
  include?: string;
}

const accountGet: ActionDefinition<Input, Record<string, unknown>> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Get a single account (customer company) by id.",
  params: [
    recordId,
    orgId,
    { key: "include", label: "Include", type: "string", hint: "Supported value: owner." },
  ],
  output: [{ key: "id", type: "string", label: "Account ID" }],

  execute(input, ctx) {
    return deskGet(ctx, "/accounts", input, { include: input.include });
  },
};

export default accountGet;
