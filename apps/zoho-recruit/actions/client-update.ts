import type { ActionDefinition } from "@w6w/types";
import { recruitUpdate, type RecruitUpdateInput } from "../lib/recruit.ts";
import { dataFields, recordId, writeOutput } from "../lib/params.ts";
import type { ZohoRecruitRecordResult } from "../lib/client.ts";

const clientUpdate: ActionDefinition<RecruitUpdateInput, ZohoRecruitRecordResult> = {
  key: "client-update",
  type: "perform",
  resource: "client",
  title: "Update Client",
  description: "Update a record in the Clients module.",
  idempotent: true,
  params: [recordId, dataFields],
  output: writeOutput,

  execute(input, ctx) {
    return recruitUpdate(ctx, "Clients", input);
  },
};

export default clientUpdate;
