import type { ActionDefinition } from "@w6w/types";
import { listQuery, LivestormClient } from "../lib/client.ts";
import type { JsonApiListResponse } from "../lib/client.ts";

interface Input {
  id: string;
  pageNumber?: number;
  pageSize?: number;
  include?: string;
}

const sessionQuestionsList: ActionDefinition<Input> = {
  key: "session-questions-list",
  type: "search",
  resource: "session",
  title: "List Session Questions",
  description: "List the Q&A questions asked during a session.",
  params: [
    { key: "id", label: "Session ID", type: "string", required: true },
    { key: "pageNumber", label: "Page number", type: "number", hint: "0-indexed." },
    { key: "pageSize", label: "Page size", type: "number" },
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      options: [{ label: "People", value: "people" }],
    },
  ],
  output: [
    { key: "data", type: "array", label: "Questions" },
    { key: "meta", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    return await new LivestormClient(ctx).request<JsonApiListResponse>(
      `/sessions/${encodeURIComponent(input.id)}/questions`,
      { query: listQuery(input) },
    );
  },
};

export default sessionQuestionsList;
