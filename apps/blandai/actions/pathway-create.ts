import type { ActionDefinition } from "@w6w/types";
import { BlandClient, compact } from "../lib/client.ts";

/**
 * `POST /v1/pathway/create` — create a new (empty) conversational pathway.
 *
 * Verified against `docs.bland.ai/api-v1/post/pathways` (doc slug
 * `pathways`; real path confirmed via `llms-full.txt`'s
 * `POST https://api.bland.ai/v1/pathway/create`). Nodes and edges are set
 * afterward with `pathway-update` — this endpoint only accepts name/description.
 */
interface Input {
  name: string;
  description?: string;
}

const pathwayCreate: ActionDefinition<Input> = {
  key: "pathway-create",
  type: "perform",
  resource: "pathway",
  title: "Create Pathway",
  description: "Create a new conversational pathway. Use pathway-update to add nodes and edges.",
  // Each call creates a distinct new pathway with a new ID.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
  ],
  output: [
    { key: "status", type: "string", label: "success or error" },
    { key: "pathwayId", type: "string", label: "New pathway ID" },
  ],

  async execute(input, ctx) {
    const res = await new BlandClient(ctx).request<{ status: string; pathway_id?: string }>(
      "/v1/pathway/create",
      { method: "POST", body: compact({ name: input.name, description: input.description }) },
    );
    return { status: res.status, pathwayId: res.pathway_id };
  },
};

export default pathwayCreate;
