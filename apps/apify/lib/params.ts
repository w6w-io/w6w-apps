import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the Apify actions.
 *
 * Every enum here is copied from Apify's OpenAPI 3.1 document (fetched
 * 2026-08-11 from `docs.apify.com/api/openapi.json`), not inferred. Where the
 * vendor documents a different ceiling per endpoint the value is stated at the
 * call site rather than averaged into one wrong number here.
 */

/**
 * `ActorJobStatus` — the lifecycle of a run *or* a build.
 *
 * Note the two hyphenated members: `TIMING-OUT` and `TIMED-OUT` are spelled
 * with a hyphen, not an underscore, unlike every webhook event type. Getting
 * that wrong silently returns zero runs rather than an error.
 */
export const runStatusOptions = [
  { value: "READY", label: "Ready — created, waiting to start" },
  { value: "RUNNING", label: "Running" },
  { value: "SUCCEEDED", label: "Succeeded" },
  { value: "FAILED", label: "Failed" },
  { value: "TIMING-OUT", label: "Timing out" },
  { value: "TIMED-OUT", label: "Timed out" },
  { value: "ABORTING", label: "Aborting" },
  { value: "ABORTED", label: "Aborted" },
];

/** `WebhookEventType`. Underscores here, unlike the run statuses above. */
export const webhookEventTypeOptions = [
  { value: "ACTOR.RUN.CREATED", label: "Run created" },
  { value: "ACTOR.RUN.SUCCEEDED", label: "Run succeeded" },
  { value: "ACTOR.RUN.FAILED", label: "Run failed" },
  { value: "ACTOR.RUN.TIMED_OUT", label: "Run timed out" },
  { value: "ACTOR.RUN.ABORTED", label: "Run aborted" },
  { value: "ACTOR.RUN.RESURRECTED", label: "Run resurrected" },
  { value: "ACTOR.BUILD.CREATED", label: "Build created" },
  { value: "ACTOR.BUILD.SUCCEEDED", label: "Build succeeded" },
  { value: "ACTOR.BUILD.FAILED", label: "Build failed" },
  { value: "ACTOR.BUILD.TIMED_OUT", label: "Build timed out" },
  { value: "ACTOR.BUILD.ABORTED", label: "Build aborted" },
  { value: "TEST", label: "Test — fired only by Test webhook" },
];

/** `ownership` filter, shared by the three storage list endpoints. */
export const ownershipOptions = [
  { value: "ownedByMe", label: "Owned by me" },
  { value: "sharedWithMe", label: "Shared with me by other users" },
];

/** Apify Store sort orders. Documented in prose, not as an OpenAPI enum. */
export const storeSortByOptions = [
  { value: "relevance", label: "Relevance (default)" },
  { value: "popularity", label: "Popularity" },
  { value: "newest", label: "Newest" },
  { value: "lastUpdate", label: "Recently updated" },
];

/** Apify Store pricing models. */
export const storePricingModelOptions = [
  { value: "FREE", label: "Free" },
  { value: "FLAT_PRICE_PER_MONTH", label: "Flat monthly price (rental)" },
  { value: "PRICE_PER_DATASET_ITEM", label: "Price per dataset item" },
  { value: "PAY_PER_EVENT", label: "Pay per event" },
];

/**
 * The offset/limit pair every list endpoint except "get list of keys" uses.
 *
 * **The default is deliberately not the vendor's.** Apify's documented default
 * for `limit` is its maximum — 1,000 for the resource lists and *unbounded* for
 * dataset items. A workflow step that silently returns 1,000 records is a
 * footgun rather than a convenience (`GET /v2/store` with the vendor default
 * returns 3.8 MB, measured 2026-08-11), so every list action here prefills a
 * small limit and says so. Raise it explicitly when you mean to.
 */
export function paginationParams(defaultLimit: number, limitHint: string): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: defaultLimit,
      validation: { integer: true, min: 1 },
      hint: limitHint,
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Number of records to skip from the start. Defaults to 0.",
    },
  ];
}

/** `desc=1` — reverse the vendor's ascending-by-creation default. */
export const descParam: Param = {
  key: "desc",
  label: "Newest first",
  type: "boolean",
  hint: "Records are returned oldest-first by default, which is what makes paging safe while new " +
    "ones are being created. Turn this on to get the newest first instead.",
};

/**
 * The dataset-item shaping parameters, shared by the four endpoints that return
 * dataset items (dataset, run's default dataset, and the two run-sync forms).
 *
 * `format` is not exposed. The endpoint can also answer CSV, XLSX, HTML, XML
 * and RSS, but an Action returns structured data to the next workflow step, not
 * a file, and an XLSX workbook has no meaningful JSON projection. JSON is the
 * vendor's own default, so nothing is lost by pinning it.
 */
export function datasetItemParams(): Param[] {
  return [
    {
      key: "clean",
      label: "Clean",
      type: "boolean",
      hint:
        "Shorthand for skipping empty items and hidden fields (those whose name starts with #).",
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint:
        "Comma-separated list of fields to keep. Output fields are ordered exactly as listed here.",
    },
    {
      key: "omit",
      label: "Omit fields",
      type: "string",
      hint: "Comma-separated list of fields to drop from each item.",
    },
    {
      key: "unwind",
      label: "Unwind",
      type: "string",
      hint:
        "Comma-separated fields to unwind: an array field becomes one record per element, merged " +
        "with its parent.",
    },
    {
      key: "flatten",
      label: "Flatten",
      type: "string",
      hint: "Comma-separated fields whose nested objects are flattened to dotted keys.",
    },
    {
      key: "skipEmpty",
      label: "Skip empty items",
      type: "boolean",
    },
    {
      key: "skipHidden",
      label: "Skip hidden fields",
      type: "boolean",
      hint: "Drop top-level fields whose name starts with #.",
    },
    {
      key: "view",
      label: "View",
      type: "string",
      hint: "Name of a view defined in the dataset schema, applied to shape the items.",
    },
  ];
}

/** Build the query for {@link datasetItemParams}. */
export interface DatasetItemShaping {
  clean?: boolean;
  fields?: string;
  omit?: string;
  unwind?: string;
  flatten?: string;
  skipEmpty?: boolean;
  skipHidden?: boolean;
  view?: string;
}

/**
 * The run-configuration overrides shared by the four "run" endpoints
 * (Actor async, Actor sync, task async, task sync).
 */
export function runOptionParams(): Param[] {
  return [
    {
      key: "build",
      label: "Build",
      type: "string",
      placeholder: "latest",
      hint:
        "Build tag or build number to run. Defaults to whatever the Actor is configured with, " +
        "usually `latest`.",
    },
    {
      key: "timeout",
      label: "Timeout (seconds)",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Overrides the Actor's configured run timeout. 0 means no timeout.",
    },
    {
      key: "memory",
      label: "Memory (MB)",
      type: "number",
      validation: { integer: true, min: 128 },
      hint:
        "Must be a power of two, minimum 128. Leave empty unless the Actor's own documentation " +
        "tells you to change it — memory also sets the CPU share.",
    },
    {
      key: "maxItems",
      label: "Max charged items",
      type: "number",
      validation: { integer: true, min: 1 },
      hint:
        "Caps what you are billed for on pay-per-result Actors. It does NOT cap what the Actor " +
        "produces.",
    },
    {
      key: "maxTotalChargeUsd",
      label: "Max total charge (USD)",
      type: "number",
      validation: { min: 0 },
      hint: "Hard ceiling on the total cost of this run, across every pricing model.",
    },
  ];
}

export interface RunOptionInput {
  build?: string;
  timeout?: number;
  memory?: number;
  maxItems?: number;
  maxTotalChargeUsd?: number;
}

export function runOptionQuery(input: RunOptionInput): Record<string, string | number | undefined> {
  return {
    build: input.build,
    timeout: input.timeout,
    memory: input.memory,
    maxItems: input.maxItems,
    maxTotalChargeUsd: input.maxTotalChargeUsd,
  };
}

/**
 * The Actor input payload, posted as the request body.
 *
 * Apify passes the POST body through to the Actor verbatim as its `INPUT`
 * record, so its shape is defined by the Actor's own input schema, not by this
 * app. That is why it is a free-form `json` param rather than a generated form.
 */
export const actorInputParam: Param = {
  key: "input",
  label: "Actor input",
  type: "json",
  hint: "Passed through to the Actor as its INPUT record. The accepted shape is the Actor's own " +
    "input schema — see the Actor's page in Apify Console or Store.",
};

/** `actorId` in its three documented addressing forms. */
export const actorIdParam: Param = {
  key: "actorId",
  label: "Actor",
  type: "string",
  required: true,
  placeholder: "apify~web-scraper",
  hint: "Actor ID (e.g. `vKg4IjxZbEYTYeW8T`), `username~actor-name`, or `~actor-name` for one in " +
    "your own account.",
};

export const taskIdParam: Param = {
  key: "taskId",
  label: "Task",
  type: "string",
  required: true,
  placeholder: "username~my-task",
  hint: "Task ID, `username~task-name`, or `~task-name` for one in your own account.",
};

export const runIdParam: Param = {
  key: "runId",
  label: "Run ID",
  type: "string",
  required: true,
  placeholder: "HG7ML7M8z78YcAPEB",
  hint: "Take it from the `id` field of a Run Actor / Run Task response.",
};

export const datasetIdParam: Param = {
  key: "datasetId",
  label: "Dataset",
  type: "string",
  required: true,
  hint:
    "Dataset ID or `username~dataset-name`. A run's own dataset is the `defaultDatasetId` field " +
    "of its run object.",
};

export const storeIdParam: Param = {
  key: "storeId",
  label: "Key-value store",
  type: "string",
  required: true,
  hint:
    "Store ID or `username~store-name`. A run's own store is the `defaultKeyValueStoreId` field " +
    "of its run object.",
};

/**
 * `unnamed=1`.
 *
 * The storage list endpoints return **only named storages by default**, and
 * every storage a run creates for itself is unnamed — so the obvious reading of
 * an empty list ("I have no datasets") is usually wrong.
 */
export const unnamedParam: Param = {
  key: "unnamed",
  label: "Include unnamed storages",
  type: "boolean",
  hint:
    "Off by default, matching the API: only *named* storages are listed. Every storage created " +
    "automatically for an Actor run is unnamed, so turn this on to see those.",
};

export const ownershipParam: Param = {
  key: "ownership",
  label: "Ownership",
  type: "select",
  options: ownershipOptions,
  hint: "Leave empty to return everything you can access.",
};
