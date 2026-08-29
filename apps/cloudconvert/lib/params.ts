import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the CloudConvert actions.
 *
 * Every field name and enum here is transcribed from CloudConvert's own docs
 * (fetched 2026-08-29 from `cloudconvert.com/docs/api-reference/*` and
 * `.../import-export/*`), not inferred.
 */

/** `job.status` / `task.status`. Documented on both the Jobs and Tasks reference pages. */
export const jobStatusOptions = [
  { value: "waiting", label: "Waiting" },
  { value: "processing", label: "Processing" },
  { value: "finished", label: "Finished" },
  { value: "error", label: "Error" },
];

/** `task.status` is the same vocabulary as job status, minus `waiting` at the job level. */
export const taskStatusOptions = jobStatusOptions;

/** Webhook event types — the three CloudConvert documents on the Webhooks reference page. */
export const webhookEventOptions = [
  { value: "job.created", label: "Job created" },
  { value: "job.finished", label: "Job finished" },
  { value: "job.failed", label: "Job failed" },
];

export const jobIdParam: Param = {
  key: "jobId",
  label: "Job ID",
  type: "string",
  required: true,
  placeholder: "9a160154-58e2-437f-9b6b-19d63b1f59e3",
  hint: "Take it from the `id` field of a Create Job / List Jobs response.",
};

export const taskIdParam: Param = {
  key: "taskId",
  label: "Task ID",
  type: "string",
  required: true,
  placeholder: "c85f3ca9-164c-4e89-8ae2-c08192a7cb08",
  hint: "Take it from the `id` field of a job's `tasks` array, or from List Tasks.",
};

export const webhookIdParam: Param = {
  key: "webhookId",
  label: "Webhook ID",
  type: "string",
  required: true,
  hint: "Take it from the `id` field of a Create Webhook / List Webhooks response.",
};

/**
 * The offset/limit pair every list endpoint uses — `per_page`/`page`, Laravel-style.
 *
 * Unlike Apify, CloudConvert's own documented default (100) is a reasonable one, so
 * this app does not override it the way `apify`'s `lib/params.ts` does; the field is
 * exposed so a caller can narrow it, not because the vendor default is unsafe.
 */
export function paginationParams(): Param[] {
  return [
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Defaults to 100 (CloudConvert's own default).",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "The result page to show. Defaults to 1.",
    },
  ];
}

/** Build the query fragment for {@link paginationParams}. */
export interface PaginationInput {
  perPage?: number;
  page?: number;
}

export function paginationQuery(input: PaginationInput): Record<string, number | undefined> {
  return { per_page: input.perPage, page: input.page };
}

export const tagParam: Param = {
  key: "tag",
  label: "Tag",
  type: "string",
  hint: "An arbitrary string to identify the job. Has no effect on processing — use it to " +
    "correlate the job with an ID in your own application.",
};

export const webhookUrlParam: Param = {
  key: "webhookUrl",
  label: "Webhook URL (this job only)",
  type: "string",
  advanced: true,
  hint: "Notifies this URL of a job.finished or job.failed event for this job only. CloudConvert " +
    "recommends an account-wide webhook (the webhook-create action) over this for most cases.",
};

/**
 * `tasks` — the full task graph, exactly as CloudConvert's own request body shapes it: an
 * object keyed by task name, each value an `{ operation, input?, ... }` task definition.
 *
 * This is deliberately a free-form `json` param rather than a generated per-operation form.
 * CloudConvert documents well over a dozen operations (`import/url`, `import/s3`, `convert`,
 * `optimize`, `capture-website`, `merge`, `export/url`, `export/s3`, …), each with its own
 * parameter set that further varies by `input_format`/`output_format` for `convert` — the
 * same reason CloudConvert's own "Convert Files" doc says "the available parameters differ
 * based on input_format and output_format" and links out to a per-format picker instead of
 * a single table. Modelling that as one static form would either omit most of the surface
 * or drift out of sync with it; the vendor's own JSON shape does not.
 */
export const tasksParam: Param = {
  key: "tasks",
  label: "Tasks",
  type: "json",
  required: true,
  hint: "An object keyed by task name, each value a `{ operation, input?, ...options }` task " +
    "definition — the exact shape CloudConvert's own API takes. Task names may contain only " +
    "letters, digits, `-` and `_`. See cloudconvert.com/docs/api-reference/jobs for the full " +
    "operation catalog (import/url, import/s3, convert, optimize, capture-website, merge, " +
    "export/url, export/s3, and more).",
  placeholder: JSON.stringify(
    {
      "import-1": { operation: "import/url", url: "https://example.com/input.docx" },
      "convert-1": {
        operation: "convert",
        input: "import-1",
        output_format: "pdf",
      },
      "export-1": { operation: "export/url", input: "convert-1" },
    },
    null,
    2,
  ),
};

export const includeJobParam: Param = {
  key: "include",
  label: "Include",
  type: "multiselect",
  options: [{ value: "tasks", label: "Tasks" }],
  hint: "Include the job's tasks in the result.",
};

export const includeTaskParam: Param = {
  key: "include",
  label: "Include",
  type: "multiselect",
  options: [
    { value: "retries", label: "Retries" },
    { value: "depends_on_tasks", label: "Depends-on tasks" },
    { value: "payload", label: "Submitted payload" },
    { value: "job", label: "Parent job" },
  ],
  hint: "Include retries, dependency tasks, the submitted payload and/or the parent job in the " +
    "result.",
};

export const includeTaskListParam: Param = {
  key: "include",
  label: "Include",
  type: "multiselect",
  options: [
    { value: "retries", label: "Retries" },
    { value: "depends_on_tasks", label: "Depends-on tasks" },
  ],
  hint: "Include retries and/or dependency tasks in the result.",
};
