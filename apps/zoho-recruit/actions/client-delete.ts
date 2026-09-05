import type { ActionDefinition } from "@w6w/types";
import { recruitDelete, type RecruitDeleteInput } from "../lib/recruit.ts";
import { recordId, writeOutput } from "../lib/params.ts";
import type { ZohoRecruitRecordResult } from "../lib/client.ts";

const clientDelete: ActionDefinition<RecruitDeleteInput, ZohoRecruitRecordResult> = {
  key: "client-delete",
  type: "perform",
  resource: "client",
  title: "Delete Client",
  description: "Delete a record from the Clients module.",
  idempotent: true,
  params: [recordId],
  output: writeOutput,

  execute(input, ctx) {
    return recruitDelete(ctx, "Clients", input);
  },
};

export default clientDelete;
