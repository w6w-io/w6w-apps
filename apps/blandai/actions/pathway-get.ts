import type { ActionDefinition } from "@w6w/types";
import { BlandClient } from "../lib/client.ts";

/**
 * `GET /v1/pathway/{pathway_id}` — one pathway's name, description, nodes and edges.
 *
 * Verified against `docs.bland.ai/api-v1/get/pathway` (path confirmed via
 * `llms-full.txt`'s `GET https://api.bland.ai/v1/pathway/{pathway_id}`).
 */
interface Input {
  pathwayId: string;
}

const pathwayGet: ActionDefinition<Input> = {
  key: "pathway-get",
  type: "read",
  resource: "pathway",
  title: "Get Pathway",
  description: "Retrieve one conversational pathway, including its nodes and edges.",
  params: [
    { key: "pathwayId", label: "Pathway ID", type: "string", required: true },
  ],
  output: [
    { key: "name", type: "string", label: "Pathway name" },
    { key: "description", type: "string", label: "Pathway description" },
    { key: "nodes", type: "array", label: "Pathway nodes" },
    { key: "edges", type: "array", label: "Pathway edges" },
  ],

  async execute(input, ctx) {
    const pathway = await new BlandClient(ctx).request<{
      name?: string;
      description?: string;
      nodes?: unknown[];
      edges?: unknown[];
    }>(`/v1/pathway/${encodeURIComponent(input.pathwayId)}`);

    return {
      name: pathway.name,
      description: pathway.description,
      nodes: pathway.nodes ?? [],
      edges: pathway.edges ?? [],
    };
  },
};

export default pathwayGet;
