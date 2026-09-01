import type { ActionDefinition } from "@w6w/types";
import { boolFlag, encodeId, LokaliseClient } from "../lib/client.ts";
import { keyIdParam, projectIdParam } from "../lib/params.ts";

/** `GET /projects/{project_id}/keys/{key_id}` — a single key's details. */
interface Input {
  projectId: string;
  keyId: number;
  includeTranslations?: boolean;
  includeComments?: boolean;
  includeScreenshots?: boolean;
}

const keyGet: ActionDefinition<Input> = {
  key: "key-get",
  type: "read",
  resource: "key",
  title: "Get Key",
  description: "Retrieve a single key, including its per-language translations.",
  params: [
    projectIdParam,
    keyIdParam,
    { key: "includeTranslations", label: "Include translations", type: "boolean", default: true },
    { key: "includeComments", label: "Include comments", type: "boolean" },
    { key: "includeScreenshots", label: "Include screenshot URLs", type: "boolean" },
  ],
  output: [
    { key: "key_id", type: "number", label: "Key ID" },
    { key: "key_name", type: "object", label: "Key name per platform" },
    { key: "translations", type: "array", label: "Translations" },
  ],

  execute(input, ctx) {
    return new LokaliseClient(ctx).json(
      `/projects/${encodeId(input.projectId)}/keys/${encodeId(input.keyId)}`,
      {
        query: {
          include_translations: boolFlag(input.includeTranslations ?? true),
          include_comments: boolFlag(input.includeComments),
          include_screenshots: boolFlag(input.includeScreenshots),
        },
      },
    );
  },
};

export default keyGet;
