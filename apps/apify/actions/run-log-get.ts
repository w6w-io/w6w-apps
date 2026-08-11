import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, encodeId, flag, truncate } from "../lib/client.ts";
import { runIdParam } from "../lib/params.ts";

/**
 * `GET /v2/actor-runs/{runId}/log` — the run's console output.
 *
 * ## It is `text/plain`, not JSON
 *
 * There is no envelope and no `data` key; the body is the log. Parsing it as
 * JSON is the obvious mistake and it fails on the first line.
 *
 * ## ANSI codes are stripped by default
 *
 * Apify removes ANSI escape sequences unless `raw` is set. Keep the default:
 * escape codes in a log that lands in a workflow variable render as garbage
 * almost everywhere.
 *
 * ## `stream` is not exposed
 *
 * The endpoint can hold the connection open and stream the log for as long as
 * the run lives. An Action returns one value to the next step, so a stream has
 * nowhere to go, and the parameter would only produce a request that hangs for
 * the duration of the run.
 *
 * A log has no documented size ceiling, so `maxBytes` truncates the tail of a
 * very large one rather than pushing megabytes of text into a run record. It
 * defaults to 200,000 characters and the result says when it truncated.
 */
interface Input {
  runId: string;
  raw?: boolean;
  maxBytes?: number;
}

const runLogGet: ActionDefinition<Input> = {
  key: "run-log-get",
  type: "read",
  resource: "run",
  title: "Get Run Log",
  description: "Fetch an Actor run's plain-text log.",
  params: [
    runIdParam,
    {
      key: "raw",
      label: "Keep ANSI escape codes",
      type: "boolean",
      hint: "Off by default, matching the API, which strips escape sequences and keeps only " +
        "printable characters.",
    },
    {
      key: "maxBytes",
      label: "Maximum characters",
      type: "number",
      default: 200000,
      validation: { integer: true, min: 1000 },
      hint:
        "Applied by this app, not by Apify: a long-running Actor's log has no documented size " +
        "ceiling. The result reports whether it was truncated.",
    },
  ],
  output: [
    { key: "log", type: "string", label: "Log text" },
    { key: "length", type: "number", label: "Full length in characters, before truncation" },
    { key: "truncated", type: "boolean", label: "Whether the log was truncated" },
  ],

  async execute(input, ctx) {
    const max = input.maxBytes ?? 200000;
    const res = await new ApifyClient(ctx).raw(`/actor-runs/${encodeId(input.runId)}/log`, {
      accept: "text/plain",
      query: { raw: flag(input.raw) },
    });
    return {
      log: truncate(res.text, max),
      length: res.text.length,
      truncated: res.text.length > max,
    };
  },
};

export default runLogGet;
