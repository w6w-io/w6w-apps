import type { ActionDefinition } from "@w6w/types";
import { recruitGet, type RecruitGetInput } from "../lib/recruit.ts";
import { listFields, recordId } from "../lib/params.ts";

const clientGet: ActionDefinition<RecruitGetInput> = {
  key: "client-get",
  type: "read",
  resource: "client",
  title: "Get Client",
  description: "Get a single record from the Clients module by id.",
  params: [recordId, listFields],
  output: [{ key: "id", type: "string", label: "Client" }],

  execute(input, ctx) {
    return recruitGet(ctx, "Clients", input);
  },
};

export default clientGet;
