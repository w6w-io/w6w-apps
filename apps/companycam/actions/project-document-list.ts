import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId, type ListPage } from "../lib/client.ts";
import { listOutput, pageParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /v2/projects/{project_id}/documents` — files filed under a project.
 *
 * Each row carries `url`, `content_type` and `byte_size`, so a workflow can
 * decide whether to fetch a document before it does. The `url` points at
 * `static.companycam.com` — a different host from the API, and one this app
 * deliberately does not call: downloading the bytes is the job of whichever
 * step actually needs them.
 */
interface Input {
  projectId: string;
  page?: number;
  perPage?: number;
}

const projectDocumentList: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "project-document-list",
  type: "search",
  resource: "document",
  title: "List Project Documents",
  description: "List the documents attached to a project, with their download URLs and sizes.",
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    ...pageParams(),
  ],
  output: listOutput,

  execute(input, ctx) {
    return new CompanyCamClient(ctx).list(
      `/projects/${encodeId(input.projectId)}/documents`,
      { query: paginationQuery(input) },
    );
  },
};

export default projectDocumentList;
