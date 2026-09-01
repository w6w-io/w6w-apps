import type { ActionDefinition } from "@w6w/types";
import { BubbleClient, parseJson } from "../lib/client.ts";

interface Input {
  workflowName: string;
  httpMethod: "GET" | "POST";
  params?: string | Record<string, unknown>;
}

/**
 * `GET|POST /wf/{workflow_name}` — verified against
 * `the-bubble-api/the-workflow-api/workflow-api-endpoints` and
 * `core-resources/api/the-bubble-api/the-workflow-api`.
 *
 * Triggers a named API Workflow the app builder has exposed ("Expose as a
 * public API workflow", in the Backend Workflows editor). There is no fixed
 * set of workflows — every Bubble app defines its own — so `workflowName`
 * names the one to call, and the HTTP method must match whatever the builder
 * chose for it ("Trigger workflow with" on the workflow itself): a GET-only
 * workflow refuses a POST and vice versa.
 *
 * Parameters travel differently per method, exactly as Bubble's own docs
 * describe: for `POST` they are the JSON request body (unless the builder
 * flagged an individual parameter `Querystring`, in which case Bubble reads
 * that one from the URL regardless); for `GET` they are always a query
 * string, since a GET request has no body.
 *
 * The response shape is whatever the workflow's own "Return data from API"
 * step defines — structured JSON by default, but a workflow can also return
 * plain text or redirect to a page. This action returns the parsed JSON when
 * the response is JSON, and the raw text otherwise.
 */
const action: ActionDefinition<Input, unknown> = {
  key: "workflow-trigger",
  type: "perform",
  resource: "workflow",
  title: "Trigger API Workflow",
  description: "Call one of this app's own API Workflows by name.",
  // Whether a retry duplicates work depends entirely on what the workflow does.
  idempotent: false,
  params: [
    {
      key: "workflowName",
      label: "Workflow Name",
      type: "string",
      required: true,
      hint: "The API Workflow's name, exactly as set in the Backend Workflows editor — also its " +
        "URL segment. No spaces or special characters.",
    },
    {
      key: "httpMethod",
      label: "HTTP Method",
      type: "select",
      required: true,
      default: "POST",
      options: [
        { value: "POST", label: "POST — parameters in the JSON body" },
        { value: "GET", label: "GET — parameters in the query string" },
      ],
      hint: "Must match the method the workflow itself was set to trigger with.",
    },
    {
      key: "params",
      label: "Parameters",
      type: "json",
      default: "",
      hint: 'Object of parameter name → value, e.g. `{"email": "a@b.com"}`.',
    },
  ],

  async execute(input, ctx) {
    const params = parseJson(input.params, "params");
    if (params !== undefined && (typeof params !== "object" || Array.isArray(params))) {
      throw new Error("`params` must be a JSON object");
    }
    const client = new BubbleClient(ctx);
    const path = `/wf/${encodeURIComponent(input.workflowName)}`;
    ctx.log("info", "triggering Bubble API workflow", {
      workflow: input.workflowName,
      method: input.httpMethod,
    });

    if (input.httpMethod === "GET") {
      const query: Record<string, string> = {};
      for (const [k, v] of Object.entries((params as Record<string, unknown>) ?? {})) {
        query[k] = typeof v === "string" ? v : JSON.stringify(v);
      }
      return await client.request(path, { method: "GET", query });
    }
    return await client.request(path, { method: "POST", json: params ?? {} });
  },
};

export default action;
