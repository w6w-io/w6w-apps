import type { ActionDefinition } from "@w6w/types";
import { encodeId, LokaliseClient } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

/** `GET /projects/{project_id}/translations/{translation_id}` — one translation item. */
interface Input {
  projectId: string;
  translationId: number;
}

const translationGet: ActionDefinition<Input> = {
  key: "translation-get",
  type: "read",
  resource: "translation",
  title: "Get Translation",
  description: "Retrieve a single translation item by id.",
  params: [
    projectIdParam,
    {
      key: "translationId",
      label: "Translation ID",
      type: "number",
      required: true,
      hint:
        "From the `translation_id` field of a key's `translations` array, or List Translations.",
    },
  ],
  output: [
    { key: "translation_id", type: "number", label: "Translation ID" },
    { key: "language_iso", type: "string", label: "Language" },
    { key: "translation", type: "string", label: "Translated text" },
    { key: "is_reviewed", type: "boolean", label: "Reviewed" },
  ],

  execute(input, ctx) {
    return new LokaliseClient(ctx).json(
      `/projects/${encodeId(input.projectId)}/translations/${encodeId(input.translationId)}`,
    );
  },
};

export default translationGet;
