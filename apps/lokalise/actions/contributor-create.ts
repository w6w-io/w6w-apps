import type { ActionDefinition } from "@w6w/types";
import { asJson, encodeId, LokaliseClient } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

/**
 * `POST /projects/{project_id}/contributors` — invite one or more
 * contributors.
 *
 * Bulk-only, like Create Keys and Create Languages. Two documented
 * interaction effects worth knowing before sending a body:
 *
 *  - **`is_admin: true` overrides `languages`.** An admin contributor gets
 *    every project language automatically, regardless of what `languages`
 *    lists.
 *  - **`fullname` is ignored for an already-registered Lokalise user.** It
 *    only takes effect the first time that email is invited anywhere.
 *
 * Not marked idempotent: inviting the same email twice is rejected per-item
 * in the response's `errors` array rather than being a no-op, and there is no
 * vendor idempotency key.
 */
interface Input {
  projectId: string;
  contributors: unknown;
}

const contributorCreate: ActionDefinition<Input> = {
  key: "contributor-create",
  type: "perform",
  resource: "contributor",
  title: "Invite Contributors",
  description: "Invite one or more contributors to the project.",
  idempotent: false,
  params: [
    projectIdParam,
    {
      key: "contributors",
      label: "Contributors",
      type: "json",
      required: true,
      hint: "Array of {email, fullname?, is_admin?, is_reviewer?, languages?}, e.g. " +
        '[{"email":"translator@example.com","languages":[{"lang_iso":"en","is_writable":false}]}]. ' +
        "`is_admin: true` overrides `languages` with access to every project language.",
    },
  ],
  output: [
    { key: "contributors", type: "array", label: "Contributors created" },
    { key: "errors", type: "array", label: "Per-item failures, if any" },
  ],

  execute(input, ctx) {
    return new LokaliseClient(ctx).json(`/projects/${encodeId(input.projectId)}/contributors`, {
      method: "POST",
      body: { contributors: asJson(input.contributors, "Contributors") },
    });
  },
};

export default contributorCreate;
