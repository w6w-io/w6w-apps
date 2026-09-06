import type { ActionDefinition } from "@w6w/types";
import { stripSecrets, VapiClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

const fileDelete: ActionDefinition<Input> = {
  key: "file-delete",
  type: "perform",
  resource: "file",
  title: "Delete File",
  description: "Delete an uploaded file by id.",
  idempotent: true,
  params: [idParam("File ID")],
  output: [
    { key: "id", type: "string", label: "File ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const file = await new VapiClient(ctx).json(`/file/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
    return stripSecrets(file);
  },
};

export default fileDelete;
