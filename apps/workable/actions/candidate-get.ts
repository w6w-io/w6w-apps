import type { ActionDefinition } from "@w6w/types";
import { WorkableClient } from "../lib/client.ts";
import { candidateOutput } from "../lib/params.ts";

interface Input {
  id: string;
}

const candidateGet: ActionDefinition<Input> = {
  key: "candidate-get",
  type: "read",
  resource: "candidate",
  title: "Get Candidate",
  description:
    "Get the full details of one candidate, including education, experience and answers " +
    "(trimmed from the list response in v3). Required scope: `r_candidates`.",
  params: [
    { key: "id", label: "Candidate ID", type: "string", required: true },
  ],
  // `GET /candidates/:id` wraps the candidate under a `candidate` key.
  output: candidateOutput.map((f) => ({ ...f, key: `candidate.${f.key}` })),

  execute(input, ctx) {
    return new WorkableClient(ctx).json(`/candidates/${encodeURIComponent(input.id)}`);
  },
};

export default candidateGet;
