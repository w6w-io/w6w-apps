import type { ActionDefinition } from "@w6w/types";
import { deskUpdate, type DeskUpdateInput } from "../lib/desk.ts";
import { dataFields, orgId, recordId } from "../lib/params.ts";

const accountUpdate: ActionDefinition<DeskUpdateInput> = {
  key: "account-update",
  type: "perform",
  resource: "account",
  title: "Update Account",
  description: 'Update fields on an existing account, e.g. { "website": "https://acme.com" }.',
  idempotent: true,
  params: [recordId, dataFields, orgId],
  output: [{ key: "id", type: "string", label: "Account ID" }],

  execute(input, ctx) {
    return deskUpdate(ctx, "/accounts", input);
  },
};

export default accountUpdate;
