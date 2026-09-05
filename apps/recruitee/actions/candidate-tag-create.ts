import type { ActionDefinition } from "@w6w/types";
import { RecruiteeClient } from "../lib/client.ts";
import { candidateIdParam } from "../lib/params.ts";

/**
 * `POST /c/{company_id}/candidates/{candidate_id}/tags` — verified against
 * the `Create candidate tags` resource. The vendor's own example body is a
 * single string, `{"tag": "Developer"}`; the response's own example shows the
 * *existing* company tag reused rather than a duplicate created, which is
 * why this is safe to retry.
 */
interface Input {
  candidateId: number;
  tag: string;
}

const candidateTagCreate: ActionDefinition<Input> = {
  key: "candidate-tag-create",
  type: "perform",
  resource: "tag",
  title: "Tag Candidate",
  description: "Apply a tag to a candidate, creating the tag company-wide if it doesn't exist yet.",
  // Recruitee's own documented example reuses the existing company tag by
  // name rather than creating a duplicate — applying the same tag twice is a
  // no-op, not two tags.
  idempotent: true,
  params: [
    candidateIdParam,
    { key: "tag", label: "Tag", type: "string", required: true },
  ],
  output: [{ key: "tags", type: "array", label: "The candidate's tags after this call" }],

  execute(input, ctx) {
    return new RecruiteeClient(ctx).request(`/candidates/${input.candidateId}/tags`, {
      method: "POST",
      body: { tag: input.tag },
    });
  },
};

export default candidateTagCreate;
