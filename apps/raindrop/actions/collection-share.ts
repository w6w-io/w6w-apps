import type { ActionDefinition } from "@w6w/types";
import { encodeId, RaindropClient, toList } from "../lib/client.ts";
import { collaboratorRoleOptions, collectionPathIdParam } from "../lib/params.ts";

/**
 * `POST /rest/v1/collection/{id}/sharing` — invite collaborators.
 *
 * **This sends email.** Each address in `emails` receives an invitation with a
 * join link; nothing is shared until they accept. That is what makes it *not*
 * idempotent — a retry sends a second invitation to a real person — so the
 * runtime must never replay it after a dropped connection.
 *
 * Two documented refusals, both worth surfacing rather than flattening into
 * "403": more than 10 addresses in one call is a `400`
 * ("you cant send more than 10 invites at once"), and an account with more than
 * 100 outstanding invitations is refused with a warning that continuing will get
 * it banned. The 10-address ceiling is enforced client-side here so the failure
 * arrives before the request rather than after it.
 */
interface Input {
  id: number;
  emails: string | string[];
  role?: string;
}

/** The vendor's documented ceiling: "Maximum 10". */
export const MAX_INVITES = 10;

const collectionShare: ActionDefinition<Input> = {
  key: "collection-share",
  type: "perform",
  resource: "sharing",
  title: "Share Collection",
  description:
    "Invite people to a collection by email. Each address receives an invitation email; nothing " +
    "is shared until they accept. Maximum 10 addresses per call.",
  idempotent: false,
  params: [
    collectionPathIdParam,
    {
      key: "emails",
      label: "Email addresses",
      type: "string",
      required: true,
      placeholder: "someone@example.com, other@example.com",
      hint: "Comma-separated, maximum 10 per call. Each one is sent an invitation email.",
    },
    {
      key: "role",
      label: "Access level",
      type: "select",
      options: collaboratorRoleOptions,
      default: "viewer",
      hint: "`member` can edit the collection and invite others; `viewer` is read-only.",
    },
  ],
  output: [
    { key: "emails", type: "array", label: "Invited addresses" },
    { key: "result", type: "boolean", label: "Invitations sent" },
  ],

  async execute(input, ctx) {
    const emails = toList(input.emails);
    if (!emails) throw new Error("Email addresses is required");
    if (emails.length > MAX_INVITES) {
      throw new Error(
        `Raindrop accepts at most ${MAX_INVITES} invitations per call; ${emails.length} were given`,
      );
    }

    const body = await new RaindropClient(ctx).ok(`/collection/${encodeId(input.id)}/sharing`, {
      method: "POST",
      body: { emails, ...(input.role ? { role: input.role } : {}) },
    });
    return {
      emails: Array.isArray(body.emails) ? body.emails : emails,
      result: body.result !== false,
    };
  },
};

export default collectionShare;
