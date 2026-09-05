import type { ActionDefinition } from "@w6w/types";
import { flag, RecruiteeClient } from "../lib/client.ts";
import { candidateIdParam } from "../lib/params.ts";

/**
 * `PATCH /c/{company_id}/candidates/{id}` — verified against the `Update
 * candidate` resource. The vendor's own example body nests the changed
 * fields under `candidate` but keeps `reveal` (un-anonymize) as a sibling key:
 *
 * ```json
 * {"candidate": {"name": "Jane Doe"}, "reveal": true}
 * ```
 *
 * `parse` is the one query-string param this endpoint documents: "Parse CV
 * and replace data previously extracted from CV file (should be string 'true'
 * or '1')".
 */
interface Input {
  candidateId: number;
  name?: string;
  emails?: string[];
  phones?: string[];
  customFields?: Array<{ label: string; values: string[] }>;
  reveal?: boolean;
  parse?: boolean;
}

const candidateUpdate: ActionDefinition<Input> = {
  key: "candidate-update",
  type: "perform",
  resource: "candidate",
  title: "Update Candidate",
  description: "Change a candidate's name, contact details or custom fields.",
  // A PATCH carrying the same fields converges on the same state, so retrying
  // a dropped response is safe.
  idempotent: true,
  params: [
    candidateIdParam,
    { key: "name", label: "Name", type: "string" },
    { key: "emails", label: "Emails", type: "array", item: { type: "string" } },
    { key: "phones", label: "Phones", type: "array", item: { type: "string" } },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      hint: 'Array of `{"label": "…", "values": ["…"]}` objects.',
    },
    {
      key: "reveal",
      label: "Reveal anonymous candidate",
      type: "boolean",
      hint: "Un-anonymize this candidate as part of the same update.",
    },
    {
      key: "parse",
      label: "Re-parse CV",
      type: "boolean",
      hint: "Parse the candidate's CV and replace previously-extracted data.",
    },
  ],
  output: [
    { key: "candidate", type: "object", label: "The updated candidate" },
    { key: "references", type: "array", label: "Related offers/stages the response references" },
  ],

  execute(input, ctx) {
    return new RecruiteeClient(ctx).request(`/candidates/${input.candidateId}`, {
      method: "PATCH",
      query: { parse: flag(input.parse) },
      body: {
        candidate: {
          name: input.name,
          emails: input.emails,
          phones: input.phones,
          custom_fields: input.customFields,
        },
        reveal: input.reveal,
      },
    });
  },
};

export default candidateUpdate;
