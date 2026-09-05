import type { ActionDefinition } from "@w6w/types";
import { compact, OpusClipClient } from "../lib/client.ts";

/**
 * `GET /api/exportable-clips` — the clips a project (or collection) produced.
 *
 * ## The `id` field is a composite; social posting wants the bare form
 *
 * The response's `id` is `{projectId}.{curationId}` (e.g. `P0000000demo.CUexample1`).
 * The social-posting endpoints (`social-copy-job-create`, `post-task-create`,
 * `publish-schedule-create`) want the **bare** clip id — everything after the
 * dot — which this response also carries directly as `curationId`. Use that
 * field rather than parsing `id`, per the vendor's own guidance.
 *
 * `x-opus-org-id` is documented as required only for a user with multiple
 * organizations; it is optional here for everyone else.
 */
interface Input {
  mode: "project" | "collection";
  projectId?: string;
  collectionId?: string;
  orgId?: string;
  pageNum?: number;
  pageSize?: number;
}

const clipList: ActionDefinition<Input> = {
  key: "clip-list",
  type: "read",
  resource: "clip",
  title: "List Clips",
  description: "List the exportable clips a project or a collection produced.",
  params: [
    {
      key: "mode",
      label: "Find by",
      type: "select",
      required: true,
      default: "project",
      options: [
        { value: "project", label: "Project" },
        { value: "collection", label: "Collection" },
      ],
    },
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      showIf: { "==": [{ var: "mode" }, "project"] },
    },
    {
      key: "collectionId",
      label: "Collection ID",
      type: "string",
      showIf: { "==": [{ var: "mode" }, "collection"] },
    },
    {
      key: "orgId",
      label: "Organization ID",
      type: "string",
      advanced: true,
      hint: "Only needed for an account belonging to multiple organizations.",
    },
    { key: "pageNum", label: "Page (starts at 1)", type: "number", advanced: true },
    { key: "pageSize", label: "Page size", type: "number", advanced: true },
  ],
  output: [{ key: "items", type: "array", label: "Clips" }],

  async execute(input, ctx) {
    const query = compact({
      q: input.mode === "collection" ? "findByCollectionId" : "findByProjectId",
      projectId: input.mode === "project" ? input.projectId : undefined,
      collectionId: input.mode === "collection" ? input.collectionId : undefined,
      pageNum: input.pageNum,
      pageSize: input.pageSize,
    });

    const items = await new OpusClipClient(ctx).json<unknown[]>("/api/exportable-clips", {
      query,
      headers: input.orgId ? { "x-opus-org-id": input.orgId } : undefined,
    });
    return { items: items ?? [] };
  },
};

export default clipList;
