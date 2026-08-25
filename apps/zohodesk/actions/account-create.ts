import type { ActionDefinition } from "@w6w/types";
import { deskCreate, type DeskCreateInput } from "../lib/desk.ts";
import { dataFields, orgId } from "../lib/params.ts";

const accountCreate: ActionDefinition<DeskCreateInput> = {
  key: "account-create",
  type: "perform",
  resource: "account",
  title: "Create Account",
  description: '`accountName` is required, e.g. { "accountName": "Zylker Inc." }.',
  idempotent: false,
  params: [dataFields, orgId],
  output: [{ key: "id", type: "string", label: "Account ID" }],

  execute(input, ctx) {
    return deskCreate(ctx, "/accounts", input);
  },
};

export default accountCreate;
