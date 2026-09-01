import type { ActionDefinition } from "@w6w/types";
import { asTextOrJson, compact, encodeId, LokaliseClient } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

/**
 * `PUT /projects/{project_id}/translations/{translation_id}` — set a
 * translation's text and/or review flags.
 *
 * `translation` accepts either a plain string or, for a plural key, a JSON
 * object of plural-form → text (Lokalise's own example:
 * `{"one":"...","other":"..."}`) — this action takes it as a `json` param so
 * both shapes reach the API unmodified.
 *
 * Idempotent: a full overwrite of the fields supplied.
 */
interface Input {
  projectId: string;
  translationId: number;
  translation?: unknown;
  isUnverified?: boolean;
  isReviewed?: boolean;
}

const translationUpdate: ActionDefinition<Input> = {
  key: "translation-update",
  type: "perform",
  resource: "translation",
  title: "Update Translation",
  description: "Set a translation's text and/or its unverified/reviewed flags.",
  idempotent: true,
  params: [
    projectIdParam,
    {
      key: "translationId",
      label: "Translation ID",
      type: "number",
      required: true,
    },
    {
      key: "translation",
      label: "Translation",
      type: "text",
      hint: 'Plain text for a singular key, or {"one":"...","other":"..."} for a plural key.',
    },
    { key: "isUnverified", label: "Unverified", type: "boolean" },
    { key: "isReviewed", label: "Reviewed", type: "boolean" },
  ],
  output: [
    { key: "translation_id", type: "number", label: "Translation ID" },
    { key: "translation", type: "string", label: "Translated text" },
    { key: "is_reviewed", type: "boolean", label: "Reviewed" },
  ],

  execute(input, ctx) {
    return new LokaliseClient(ctx).json(
      `/projects/${encodeId(input.projectId)}/translations/${encodeId(input.translationId)}`,
      {
        method: "PUT",
        body: compact({
          translation: asTextOrJson(input.translation),
          is_unverified: input.isUnverified,
          is_reviewed: input.isReviewed,
        }),
      },
    );
  },
};

export default translationUpdate;
