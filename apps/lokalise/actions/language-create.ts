import type { ActionDefinition } from "@w6w/types";
import { asJson, encodeId, LokaliseClient } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

/**
 * `POST /projects/{project_id}/languages` — add one or more languages to a
 * project.
 *
 * Bulk-only, like Create Keys and Create Contributors: even one language is
 * `{"languages": [{"lang_iso": "en"}]}`. Only `lang_iso` (one of the
 * `language-list-system` catalog entries) is required per item; `custom_iso`,
 * a custom display name and plural forms may all be overridden.
 *
 * Not marked idempotent: adding a language already in the project is
 * rejected per-item in the response's `errors` array rather than silently
 * ignored, so a blind retry surfaces a visible (harmless) error rather than
 * duplicating anything — but there is no vendor idempotency key to point to.
 */
interface Input {
  projectId: string;
  languages: unknown;
}

const languageCreate: ActionDefinition<Input> = {
  key: "language-create",
  type: "perform",
  resource: "language",
  title: "Add Languages",
  description: "Add one or more languages to a project.",
  idempotent: false,
  params: [
    projectIdParam,
    {
      key: "languages",
      label: "Languages",
      type: "json",
      required: true,
      hint: "Array of {lang_iso, custom_iso?, custom_name?, plural_forms?}, e.g. " +
        '[{"lang_iso":"en"},{"lang_iso":"en_GB","custom_iso":"en-gb"}]. `lang_iso` must be one of ' +
        "the values from List System Languages.",
    },
  ],
  output: [
    { key: "languages", type: "array", label: "Languages added" },
    { key: "errors", type: "array", label: "Per-item failures, if any" },
  ],

  execute(input, ctx) {
    return new LokaliseClient(ctx).json(`/projects/${encodeId(input.projectId)}/languages`, {
      method: "POST",
      body: { languages: asJson(input.languages, "Languages") },
    });
  },
};

export default languageCreate;
