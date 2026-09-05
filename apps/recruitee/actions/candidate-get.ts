import type { ActionDefinition } from "@w6w/types";
import { RecruiteeClient } from "../lib/client.ts";
import { candidateIdParam } from "../lib/params.ts";

/** `GET /c/{company_id}/candidates/{id}` — "Show candidate". */
interface Input {
  candidateId: number;
}

const candidateGet: ActionDefinition<Input> = {
  key: "candidate-get",
  type: "read",
  resource: "candidate",
  title: "Get Candidate",
  description: "Fetch a single candidate by id.",
  params: [candidateIdParam],
  output: [
    { key: "candidate", type: "object", label: "The candidate" },
    { key: "references", type: "array", label: "Related offers/stages the candidate references" },
  ],

  execute(input, ctx) {
    return new RecruiteeClient(ctx).request(`/candidates/${input.candidateId}`);
  },
};

export default candidateGet;
