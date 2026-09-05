import type { ActionDefinition } from "@w6w/types";
import { WorkableClient } from "../lib/client.ts";
import { jobOutput } from "../lib/params.ts";

interface Input {
  shortcode: string;
}

const jobGet: ActionDefinition<Input> = {
  key: "job-get",
  type: "read",
  resource: "job",
  title: "Get Job",
  description: "Get the full details of one job by its shortcode. Required scope: `r_jobs`.",
  params: [
    {
      key: "shortcode",
      label: "Job shortcode",
      type: "string",
      required: true,
      hint: "The system-generated code, e.g. `GROOV003` — see List Jobs.",
    },
  ],
  // `GET /jobs/:shortcode` answers the job object directly — no envelope.
  output: jobOutput,

  execute(input, ctx) {
    return new WorkableClient(ctx).json(`/jobs/${encodeURIComponent(input.shortcode)}`);
  },
};

export default jobGet;
