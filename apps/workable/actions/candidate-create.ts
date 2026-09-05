import type { ActionDefinition } from "@w6w/types";
import { compact, WorkableClient } from "../lib/client.ts";
import { candidateOutput } from "../lib/params.ts";

interface Input {
  shortcode: string;
  stage?: string;
  sourced?: boolean;
  name?: string;
  firstname?: string;
  lastname?: string;
  email: string;
  headline?: string;
  summary?: string;
  address?: string;
  phone?: string;
  coverLetter?: string;
}

/**
 * Creates a candidate directly on a job — the "uploaded" or "applied" path
 * Workable's own recruiters use, not the public job-board application form.
 *
 * `sourced` is the pivot the vendor's own docs call out explicitly: leave it
 * `true` (the API's own default) and the candidate lands in the Sourced stage
 * with no email; set it `false` and Workable treats them as having applied —
 * moved to the Applied stage (unless `stage` overrides it) and sent the
 * "thank you for applying" email. Getting this backwards is the single
 * easiest way to silently email a real applicant's inbox from a migration
 * script, or silently skip it for a real applicant.
 */
const candidateCreate: ActionDefinition<Input> = {
  key: "candidate-create",
  type: "perform",
  resource: "candidate",
  title: "Create Candidate",
  description:
    "Create a candidate on a job. Required scope: `w_candidates`. See the description for what " +
    "`sourced` controls — it decides whether the candidate is emailed.",
  // Workable mints a new candidate id per call with no idempotency key support.
  idempotent: false,
  params: [
    { key: "shortcode", label: "Job shortcode", type: "string", required: true },
    {
      key: "sourced",
      label: "Sourced (not a real applicant)",
      type: "boolean",
      default: true,
      hint: "On: no email is sent, candidate starts in Sourced. Off: treated as a real " +
        'applicant — Workable sends the "thank you for applying" email.',
    },
    {
      key: "stage",
      label: "Stage",
      type: "string",
      advanced: true,
      hint: "Override the default Sourced/Applied stage. Slug from List Job Pipeline Stages.",
    },
    { key: "name", label: "Full name", type: "string", row: "name" },
    { key: "firstname", label: "First name", type: "string", row: "name" },
    { key: "lastname", label: "Last name", type: "string", row: "name" },
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      hint: "`name`, or both `firstname` and `lastname`, must also be provided.",
    },
    { key: "headline", label: "Headline", type: "string" },
    { key: "summary", label: "Summary", type: "text", advanced: true },
    { key: "address", label: "Address", type: "string", advanced: true },
    { key: "phone", label: "Phone", type: "string", advanced: true },
    { key: "coverLetter", label: "Cover letter", type: "text", advanced: true },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
    ...candidateOutput.map((f) => ({ ...f, key: `candidate.${f.key}` })),
  ],

  execute(input, ctx) {
    return new WorkableClient(ctx).json(
      `/jobs/${encodeURIComponent(input.shortcode)}/candidates`,
      {
        method: "POST",
        query: compact({ stage: input.stage }),
        body: {
          sourced: input.sourced ?? true,
          candidate: compact({
            name: input.name,
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
      },
    );
  },
};

export default candidateCreate;
