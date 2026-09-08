import type { ActionDefinition } from "@w6w/types";
import { stripSecrets, VapiClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

const fileGet: ActionDefinition<Input> = {
  key: "file-get",
  type: "read",
  resource: "file",
  title: "Get File",
  description: "Read one uploaded file's metadata by id.",
  params: [idParam("File ID")],
  output: [
    { key: "id", type: "string", label: "File ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const file = await new VapiClient(ctx).json(`/file/${encodeURIComponent(input.id)}`);
    return stripSecrets(file);
  },
};

export default fileGet;
