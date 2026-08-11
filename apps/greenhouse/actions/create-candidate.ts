import type { ActionDefinition } from "@w6w/types";
import { HarvestClient } from "../lib/client.ts";
import { emailTypeOptions, phoneTypeOptions } from "../lib/params.ts";

/**
 * `POST /v3/candidates` — add a person to Greenhouse, optionally with their
 * first application.
 *
 * Only `first_name` and `last_name` are required. Everything else, including
 * contact details, is optional — Greenhouse will happily store a nameless-looking
 * record with no way to reach the person, so a sourcing workflow should supply at
 * least one e-mail address.
 *
 * ## The nested `application` is the documented way to do both at once
 *
 * Greenhouse's own guidance on `POST /v3/applications` says: "To create a
 * candidate and their first application in a single call, use `POST /v3/candidates`
 * with a nested `application` object." The candidate arm of that object requires
 * exactly one field, `job_id`, and places the candidate at the job's first
 * interview stage. That single field is what `jobId` below sends. The prospect
 * arm (pools, prospective departments and offices) is not exposed here — use
 * `create-application` for prospects, where those fields have room to be
 * described properly.
 *
 * ## Not idempotent, and there is no idempotency key
 *
 * Harvest v3 accepts no idempotency header on any endpoint. Every call creates a
 * new person, so a retried step produces a duplicate candidate rather than the
 * same one twice — which is why this is marked `idempotent: false` and why a
 * workflow that might re-run should look the person up with
 * `list-candidates` + an `email` filter first.
 */
interface Input {
  firstName: string;
  lastName: string;
  preferredName?: string;
  company?: string;
  title?: string;
  emailAddress?: string;
  emailType?: string;
  phoneNumber?: string;
  phoneType?: string;
  tags?: string;
  jobId?: number;
  sourceId?: number;
  recruiterId?: number;
  coordinatorId?: number;
}

function splitTags(raw: string | undefined): string[] | undefined {
  const tags = (raw ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  return tags.length > 0 ? tags : undefined;
}

const createCandidate: ActionDefinition<Input> = {
  key: "create-candidate",
  type: "perform",
  resource: "candidate",
  title: "Create Candidate",
  description: "Create a candidate, optionally placing them onto a job as their first application.",
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string", required: true, row: "name" },
    { key: "lastName", label: "Last name", type: "string", required: true, row: "name" },
    { key: "preferredName", label: "Preferred name", type: "string" },
    { key: "company", label: "Current company", type: "string", row: "role" },
    { key: "title", label: "Current title", type: "string", row: "role" },
    {
      key: "emailAddress",
      label: "E-mail address",
      type: "string",
      row: "email",
      hint: "Strongly recommended: without one there is no way to contact the candidate and no " +
        "way for a later run to find them again.",
    },
    {
      key: "emailType",
      label: "E-mail type",
      type: "select",
      options: emailTypeOptions,
      default: "personal",
      row: "email",
      hint: "Greenhouse requires a type alongside every address.",
    },
    { key: "phoneNumber", label: "Phone number", type: "string", row: "phone" },
    {
      key: "phoneType",
      label: "Phone type",
      type: "select",
      options: phoneTypeOptions,
      default: "mobile",
      row: "phone",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated tag names.",
    },
    {
      key: "jobId",
      label: "Apply to job id",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Creates the candidate's first application on this job, at the job's first interview " +
        "stage. Leave empty to create the person without an application.",
    },
    {
      key: "sourceId",
      label: "Source id",
      type: "number",
      validation: { integer: true, min: 1 },
      dependsOn: ["jobId"],
      hint: "Attribution for that first application. Ids come from the List Sources action; a " +
        "free-text source name is not accepted.",
    },
    {
      key: "recruiterId",
      label: "Recruiter user id",
      type: "number",
      validation: { integer: true, min: 1 },
      dependsOn: ["jobId"],
    },
    {
      key: "coordinatorId",
      label: "Coordinator user id",
      type: "number",
      validation: { integer: true, min: 1 },
      dependsOn: ["jobId"],
    },
  ],
  output: [
    { key: "id", type: "number", label: "Candidate id" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = {
      first_name: input.firstName,
      last_name: input.lastName,
    };
    if (input.preferredName) body.preferred_name = input.preferredName;
    if (input.company) body.company = input.company;
    if (input.title) body.title = input.title;
    if (input.emailAddress) {
      body.email_addresses = [{
        value: input.emailAddress,
        type: input.emailType ?? "personal",
      }];
    }
    if (input.phoneNumber) {
      body.phone_numbers = [{ value: input.phoneNumber, type: input.phoneType ?? "mobile" }];
    }
    const tags = splitTags(input.tags);
    if (tags) body.tags = tags;

    if (input.jobId) {
      const application: Record<string, unknown> = { job_id: input.jobId };
      if (input.sourceId) application.source_id = input.sourceId;
      if (input.recruiterId) application.recruiter_id = input.recruiterId;
      if (input.coordinatorId) application.coordinator_id = input.coordinatorId;
      body.application = application;
    }

    return new HarvestClient(ctx).json("/candidates", { method: "POST", body });
  },
};

export default createCandidate;
