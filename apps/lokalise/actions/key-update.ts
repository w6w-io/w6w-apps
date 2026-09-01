import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, encodeId, LokaliseClient, toList } from "../lib/client.ts";
import { keyIdParam, projectIdParam } from "../lib/params.ts";

/**
 * `PUT /projects/{project_id}/keys/{key_id}` — update a key's properties
 * (and, via `translations`, its per-language translations in the same call).
 *
 * Idempotent: a full overwrite of the fields supplied, so re-sending the same
 * input leaves the key in the same state.
 */
interface Input {
  projectId: string;
  keyId: number;
  description?: string;
  platforms?: string[];
  tags?: string[];
  isPlural?: boolean;
  isArchived?: boolean;
  translations?: unknown;
}

const keyUpdate: ActionDefinition<Input> = {
  key: "key-update",
  type: "perform",
  resource: "key",
  title: "Update Key",
  description: "Update a key's properties, tags, platforms, or translations.",
  idempotent: true,
  params: [
    projectIdParam,
    keyIdParam,
    { key: "description", label: "Description", type: "text" },
    {
      key: "platforms",
      label: "Platforms",
      type: "multiselect",
      options: [
        { value: "ios", label: "iOS" },
        { value: "android", label: "Android" },
        { value: "web", label: "Web" },
        { value: "other", label: "Other" },
      ],
    },
    { key: "tags", label: "Tags", type: "multiselect", hint: "Free-form tag names." },
    { key: "isPlural", label: "Plural key", type: "boolean" },
    { key: "isArchived", label: "Archived", type: "boolean" },
    {
      key: "translations",
      label: "Translations",
      type: "json",
      advanced: true,
      hint: "Array of {language_iso, translation} to set in the same call, e.g. " +
        '[{"language_iso":"en","translation":"Welcome"}]. Leave empty to change only the ' +
        "properties above.",
    },
  ],
  output: [
    { key: "key_id", type: "number", label: "Key ID" },
    { key: "key_name", type: "object", label: "Key name per platform" },
  ],

  execute(input, ctx) {
    return new LokaliseClient(ctx).json(
      `/projects/${encodeId(input.projectId)}/keys/${encodeId(input.keyId)}`,
      {
        method: "PUT",
        body: compact({
          description: input.description,
          platforms: toList(input.platforms),
          tags: toList(input.tags),
          is_plural: input.isPlural,
          is_archived: input.isArchived,
          translations: asOptionalJson(input.translations, "Translations"),
        }),
      },
    );
  },
};

export default keyUpdate;
