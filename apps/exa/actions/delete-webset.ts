import type { ActionDefinition } from "@w6w/types";
import { ExaClient } from "../lib/client.ts";

interface Input {
  id: string;
}

interface Webset {
  id?: string;
  status?: string;
  [key: string]: unknown;
}

/** DELETE /v0/websets/{id} — permanently delete a Webset and its items. */
const deleteWebset: ActionDefinition<Input, Webset> = {
  key: "delete-webset",
  type: "perform",
  resource: "webset",
  title: "Delete Webset",
  description: "Permanently delete a Webset.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Webset ID",
      type: "string",
      required: true,
      hint: "The Webset's id, or your own externalId.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webset ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const client = new ExaClient(ctx);
    return client.request<Webset>(`/v0/websets/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
  },
};

export default deleteWebset;
