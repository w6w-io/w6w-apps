import type { ActionDefinition } from "@w6w/types";
import { encodeId, TapfiliateClient } from "../lib/client.ts";
import { programIdParam } from "../lib/params.ts";

/** `GET /programs/{program_id}/` */
interface Input {
  programId: string;
}

const programGet: ActionDefinition<Input> = {
  key: "program-get",
  type: "read",
  resource: "program",
  title: "Get Program",
  description: "Fetch a single program.",
  params: [programIdParam],
  output: [
    { key: "id", type: "string", label: "Program id" },
    { key: "title", type: "string", label: "Title" },
    { key: "currency", type: "string", label: "Default currency" },
    { key: "cookie_time", type: "number", label: "Cookie duration (days)" },
    { key: "recurring", type: "boolean", label: "Whether commissions recur" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).json(`/programs/${encodeId(input.programId)}/`);
  },
};

export default programGet;
