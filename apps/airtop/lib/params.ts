import type { OutputField, Param } from "@w6w/types";

/**
 * Shared `Param` fragments and `OutputField` lists for the Airtop actions.
 *
 * Copied from Airtop's OpenAPI 3.1.0 document (`api.airtop.ai/api/openapi.json`,
 * fetched 2026-09-01), not inferred.
 */

export const sessionIdParam: Param = {
  key: "sessionId",
  label: "Session ID",
  type: "string",
  required: true,
  hint: "Take it from the `id` field of a Create Session response.",
};

export const windowIdParam: Param = {
  key: "windowId",
  label: "Window ID",
  type: "string",
  required: true,
  hint: "Take it from the `windowId` field of a Create Window / List Windows response.",
};

/**
 * The three cost/tracking fields every AI-driven window interaction accepts
 * (click, hover, type, scroll, screenshot, scrape-content, page-query,
 * paginated-extraction, summarize-content, file-input).
 */
export function aiInteractionParams(): Param[] {
  return [
    {
      key: "costThresholdCredits",
      label: "Cost threshold (credits)",
      type: "number",
      validation: { integer: true, min: 0 },
      hint:
        "Cancel the operation once it exceeds this many credits. Checked periodically during the " +
        "call, not a hard limit. Leave empty to use Airtop's default threshold; set to 0 to " +
        "disable the check entirely (not recommended).",
    },
    {
      key: "timeThresholdSeconds",
      label: "Time threshold (seconds)",
      type: "number",
      validation: { integer: true, min: 0 },
      hint:
        "Cancel the operation once it exceeds this many seconds. Checked periodically, not a hard " +
        "limit, and does not extend the session's own idle timeout.",
    },
    {
      key: "clientRequestId",
      label: "Client request ID",
      type: "string",
      hint: "Opaque id you supply, echoed back for correlating this call with your own logs.",
    },
  ];
}

export interface AiInteractionInput {
  costThresholdCredits?: number;
  timeThresholdSeconds?: number;
  clientRequestId?: string;
}

export function aiInteractionBody(input: AiInteractionInput): Record<string, unknown> {
  return {
    costThresholdCredits: input.costThresholdCredits,
    timeThresholdSeconds: input.timeThresholdSeconds,
    clientRequestId: input.clientRequestId,
  };
}

/** The output every AI-driven window interaction shares. */
export function aiOutput(...extra: OutputField[]): OutputField[] {
  return [
    { key: "modelResponse", type: "string", label: "Model response" },
    { key: "status", type: "string", label: "Outcome (success / partial / failure)" },
    { key: "credits", type: "number", label: "Credits used" },
    { key: "requestId", type: "string", label: "Request ID" },
    ...extra,
  ];
}

/** `WindowLoadUrlV1Body.waitUntil` / `CreateWindowInputV1Body.waitUntil`. */
export const waitUntilOptions = [
  { value: "load", label: "Load — DOM and assets loaded (default)" },
  { value: "domContentLoaded", label: "DOM content loaded" },
  { value: "complete", label: "Complete — page and all iframes loaded" },
  { value: "noWait", label: "No wait — return immediately" },
];

export const waitUntilParam: Param = {
  key: "waitUntil",
  label: "Wait until",
  type: "select",
  options: waitUntilOptions,
  hint: "Defaults to 'load' if left empty.",
};

export const waitUntilTimeoutSecondsParam: Param = {
  key: "waitUntilTimeoutSeconds",
  label: "Wait timeout (seconds)",
  type: "number",
  default: 30,
  validation: { integer: true, min: 0 },
  hint: "If the load event hasn't occurred by this time, the call still succeeds but returns a " +
    "warning that the page may still be loading.",
};

/** `GET /v1/sessions` and `GET /v1/files` share this offset/limit pagination shape. */
export function paginationParams(defaultLimit: number): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: defaultLimit,
      validation: { integer: true, min: 1 },
      hint: "Number of records to return.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      validation: { integer: true, min: -1 },
      hint:
        "Number of records to skip. Airtop's own documented default is -1 (meaning: start from " +
        "the first page) — leave empty for the same effect.",
    },
  ];
}

/** `ExternalSessionWithConnectionInfo` fields this app surfaces. */
export const sessionOutput: OutputField[] = [
  { key: "id", type: "string", label: "Session ID" },
  { key: "status", type: "string", label: "Status" },
  { key: "cdpUrl", type: "string", label: "Chrome DevTools Protocol URL" },
  { key: "cdpWsUrl", type: "string", label: "CDP WebSocket URL" },
  { key: "chromedriverUrl", type: "string", label: "Chromedriver URL" },
  { key: "dateCreated", type: "string", label: "Created at" },
  { key: "lastActivity", type: "string", label: "Last activity at" },
];

/** `WindowId` fields — returned by Create Window. */
export const createWindowOutput: OutputField[] = [
  { key: "windowId", type: "string", label: "Window ID" },
  { key: "targetId", type: "string", label: "CDP target ID" },
  { key: "title", type: "string", label: "Window title" },
  { key: "url", type: "string", label: "Current URL" },
];

/** `Window` fields — returned by Get Window. */
export const windowOutput: OutputField[] = [
  { key: "windowId", type: "string", label: "Window ID" },
  { key: "targetId", type: "string", label: "CDP target ID" },
  { key: "liveViewUrl", type: "string", label: "Live view URL" },
];
