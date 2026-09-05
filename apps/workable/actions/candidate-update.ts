import type { ActionDefinition } from "@w6w/types";
import { compact, WorkableClient } from "../lib/client.ts";
import { candidateOutput } from "../lib/params.ts";

interface Input {
  id: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  headline?: string;
  summary?: string;
  address?: string;
  phone?: string;
  coverLetter?: string;
}

/**
 * Partially updates a candidate's scalar fields. Behaves like `PATCH` on this
 * subset — only the fields you set are touched. (Workable's docs warn that
 * the *array* fields, e.g. `education_entries`, behave like `PUT` and replace
 * the whole list; this action does not expose those, so that trap does not
 * apply here.)
 */
const candidateUpdate: ActionDefinition<Input> = {
  key: "candidate-update",
  type: "perform",
  resource: "candidate",
  title: "Update Candidate",
  description: "Update a candidate's basic fields. Required scope: `w_candidates`.",
  idempotent: true,
  params: [
    { key: "id", label: "Candidate ID", type: "string", required: true },
    { key: "firstname", label: "First name", type: "string", row: "name" },
    { key: "lastname", label: "Last name", type: "string", row: "name" },
    { key: "email", label: "Email", type: "string" },
    { key: "headline", label: "Headline", type: "string" },
    { key: "summary", label: "Summary", type: "text", advanced: true },
    { key: "address", label: "Address", type: "string", advanced: true },
    { key: "phone", label: "Phone", type: "string", advanced: true },
    { key: "coverLetter", label: "Cover letter", type: "text", advanced: true },
  ],
  // `PATCH /candidates/:id` wraps the candidate under a `candidate` key.
  output: candidateOutput.map((f) => ({ ...f, key: `candidate.${f.key}` })),

  execute(input, ctx) {
    return new WorkableClient(ctx).json(`/candidates/${encodeURIComponent(input.id)}`, {
      method: "PATCH",
      body: {
        candidate: compact({
          firstname: input.firstname,
          lastname: input.lastname,
          email: input.email,
          headline: input.headline,
          summary: input.summary,
          address: input.address,
          phone: input.phone,
          cover_letter: input.coverLetter,
        }),
      },
    });
  },
};

export default candidateUpdate;
