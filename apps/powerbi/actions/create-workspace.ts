import type { ActionDefinition } from "@w6w/types";
import { PowerBIClient } from "../lib/client.ts";
import { workspaceOutput } from "../lib/params.ts";

interface Input {
  name: string;
}

/**
 * `POST /groups?workspaceV2=True`
 * https://learn.microsoft.com/en-us/rest/api/power-bi/groups/create-group
 *
 * `workspaceV2=True` is pinned rather than exposed as a param: the reference
 * states "The only supported value is true," and a workspace created without
 * it is the legacy (v1) kind Microsoft no longer recommends.
 *
 * Required scope: `Workspace.ReadWrite.All` (no Read-only alternative
 * documented for this write).
 *
 * The reference's own "Responses" table names the return type `Group` (a
 * single object), but **both** of its live-tagged JSON examples on the same
 * page show `{"value": [ {...} ] }` — the collection-wrapped shape `Get
 * Groups` returns, not a bare object. Since the two concrete examples agree
 * with each other and disagree with the abstract type label, this action
 * trusts the examples and unwraps `value[0]` — but falls back to the body
 * itself if a future response ever *is* the bare `Group` the docs claim,
 * rather than assuming one shape and breaking silently on the other.
 */
const createWorkspace: ActionDefinition<Input> = {
  key: "create-workspace",
  type: "perform",
  resource: "workspace",
  title: "Create Workspace",
  description: "Create a new Power BI workspace.",
  // Each call mints a new workspace id; Power BI does not treat `name` as a
  // uniqueness key, so a retry with the same name creates a second workspace.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, placeholder: "sample workspace" },
  ],
  output: workspaceOutput,

  async execute(input, ctx) {
    const client = new PowerBIClient(ctx);
    const body = await client.request<{ value?: unknown[] } | Record<string, unknown>>("/groups", {
      method: "POST",
      query: { workspaceV2: true },
      body: { name: input.name },
    });
    if (body && typeof body === "object" && Array.isArray((body as { value?: unknown[] }).value)) {
      return (body as { value: unknown[] }).value[0];
    }
    return body;
  },
};

export default createWorkspace;
