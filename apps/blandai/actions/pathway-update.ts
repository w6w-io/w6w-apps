import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, BlandClient, compact } from "../lib/client.ts";

/**
 * `POST /v1/pathway/{pathway_id}` — update a pathway's name, description, nodes and edges.
 *
 * Verified against `docs.bland.ai/api-v1/post/update_pathways` (doc slug
 * `update_pathways`; real path confirmed via `llms-full.txt`'s
 * `POST https://api.bland.ai/v1/pathway/{pathway_id}`). `nodes`/`edges` are
 * passed through as JSON — their schema (node types, data shapes) is
 * extensive and vendor-defined; this action does not attempt to validate it,
 * matching Bland's own dashboard editor which is the primary way nodes/edges
 * are authored.
 */
interface Input {
  pathwayId: string;
  name?: string;
  description?: string;
  nodes?: unknown;
  edges?: unknown;
}

const pathwayUpdate: ActionDefinition<Input> = {
  key: "pathway-update",
  type: "perform",
  resource: "pathway",
  title: "Update Pathway",
  description: "Update a pathway's name, description, nodes, and/or edges.",
  // Submitting the same update twice leaves the pathway in the same state.
  idempotent: true,
  params: [
    { key: "pathwayId", label: "Pathway ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "nodes",
      label: "Nodes",
      type: "json",
      hint: "Array of node objects. See README for shape.",
    },
    { key: "edges", label: "Edges", type: "json", hint: "Array of edge objects." },
  ],
  output: [
    { key: "status", type: "string", label: "success or error" },
  ],

  async execute(input, ctx) {
    const body = compact({
      name: input.name,
      description: input.description,
      nodes: asOptionalJson<unknown[]>(input.nodes, "nodes"),
      edges: asOptionalJson<unknown[]>(input.edges, "edges"),
    });
    const res = await new BlandClient(ctx).request<{ status: string }>(
      `/v1/pathway/${encodeURIComponent(input.pathwayId)}`,
      { method: "POST", body },
    );
    return { status: res.status };
  },
};

export default pathwayUpdate;
