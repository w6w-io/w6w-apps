import type { ActionDefinition } from "@w6w/types";
import { recruitCreate, type RecruitCreateInput } from "../lib/recruit.ts";
import { dataFields, writeOutput } from "../lib/params.ts";
import type { ZohoRecruitRecordResult } from "../lib/client.ts";

const clientCreate: ActionDefinition<RecruitCreateInput, ZohoRecruitRecordResult> = {
  key: "client-create",
  type: "perform",
  resource: "client",
  title: "Create Client",
  description: 'Create a record in the Clients module. Zoho requires "Client_Name".',
  idempotent: false,
  params: [dataFields],
  output: writeOutput,

  execute(input, ctx) {
    return recruitCreate(ctx, "Clients", input);
  },
};

export default clientCreate;
