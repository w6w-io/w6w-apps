import type { ActionDefinition } from "@w6w/types";
import { HarvestClient, idList } from "../lib/client.ts";

/**
 * `POST /v3/applications` — put an existing candidate onto a job, or make them a
 * prospect.
 *
 * The body is a `oneOf` with two arms, and picking the wrong one is a 422:
 *
 *  - **candidate application** — `candidate_id` + `job_id`. The candidate lands
 *    on the job's first interview stage, or on `initial_stage_id` when supplied.
 *  - **prospect application** — `candidate_id` + `prospect: true`. A prospect is
 *    someone being considered but not formally in process; it may be attached to
 *    several prospective jobs via `job_ids`, or to none at all.
 *
 * `prospect` below selects the arm, and the two id fields are wired to whichever
 * one it picks — `jobId` (singular) for a real application, `prospectiveJobIds`
 * (plural) for a prospect. They are genuinely different parameters in the API,
 * not a plural convenience.
 *
 * To create the *person* and their first application together, use
 * `create-candidate` with its Apply-to-job-id field: Greenhouse documents that as
 * the single-call path, and doing it in two steps here leaves a candidate behind
 * if the second call fails.
 */
interface Input {
  candidateId: number;
  prospect?: boolean;
  jobId?: number;
  prospectiveJobIds?: string;
  initialStageId?: number;
  sourceId?: number;
  referrerId?: number;
  recruiterId?: number;
  coordinatorId?: number;
}

const createApplication: ActionDefinition<Input> = {
  key: "create-application",
  type: "perform",
  resource: "application",
  title: "Create Application",
  description: "Add an application or a prospect record for an existing candidate.",
  idempotent: false,
  params: [
    {
      key: "candidateId",
      label: "Candidate id",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "prospect",
      label: "Create as a prospect",
      type: "boolean",
      default: false,
      hint: "Off creates a real application on one job. On creates a prospect, who may be " +
        "attached to several prospective jobs or to none.",
    },
    {
      key: "jobId",
      label: "Job id",
      type: "number",
      validation: { integer: true, min: 1 },
      showIf: { "!": { var: "prospect" } },
      hint: "Required for a real application. The candidate lands on this job's first interview " +
        "stage unless an initial stage is given.",
    },
    {
      key: "initialStageId",
      label: "Initial stage id",
      type: "number",
      validation: { integer: true, min: 1 },
      showIf: { "!": { var: "prospect" } },
      hint: "A job interview stage id from the List Job Interview Stages action. Omit to start " +
        "at the job's first stage.",
    },
    {
      key: "prospectiveJobIds",
      label: "Prospective job ids",
      type: "string",
      showIf: { var: "prospect" },
      hint: "Comma-separated. Optional even for a prospect — a jobless prospect is valid.",
    },
    {
      key: "sourceId",
      label: "Source id",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Attribution. Ids come from the List Sources action.",
    },
    {
      key: "referrerId",
      label: "Referrer user id",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    {
      key: "recruiterId",
      label: "Recruiter user id",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    {
      key: "coordinatorId",
      label: "Coordinator user id",
      type: "number",
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "id", type: "number", label: "Application id" },
    { key: "candidate_id", type: "number", label: "Candidate id" },
    { key: "job_id", type: "number", label: "Job id" },
    { key: "status", type: "string", label: "Status — `in_process` for a new application" },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = { candidate_id: input.candidateId };

    if (input.prospect === true) {
      body.prospect = true;
      const jobIds = idList(input.prospectiveJobIds, "prospectiveJobIds");
      if (jobIds) body.job_ids = jobIds.split(",").map(Number);
    } else {
      if (!input.jobId) {
        throw new Error(
          "A job id is required unless you are creating a prospect. Greenhouse's application " +
            "body accepts either candidate_id + job_id, or candidate_id + prospect: true.",
        );
      }
      body.job_id = input.jobId;
      if (input.initialStageId) body.initial_stage_id = input.initialStageId;
    }

    if (input.sourceId) body.source_id = input.sourceId;
    if (input.referrerId) body.referrer_id = input.referrerId;
    if (input.recruiterId) body.recruiter_id = input.recruiterId;
    if (input.coordinatorId) body.coordinator_id = input.coordinatorId;

    return new HarvestClient(ctx).json("/applications", { method: "POST", body });
  },
};

export default createApplication;
