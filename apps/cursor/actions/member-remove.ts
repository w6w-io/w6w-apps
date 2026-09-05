import type { ActionDefinition } from "@w6w/types";
import { CursorClient } from "../lib/client.ts";

interface Input {
  email?: string;
  userId?: string;
}

interface RemoveMemberResponse {
  success: boolean;
  userId: string;
  hasBillingCycleUsage: boolean;
}

/**
 * `POST /teams/remove-member` — offboard a team member.
 *
 * Rate limited to 50 requests/minute per team. The vendor requires **exactly
 * one** of `email` / `userId` — both present or both absent are documented
 * error cases (`{"error": "Either userId or email must be provided"}` /
 * `{"error": "Only one of userId or email should be provided, not both"}`),
 * so this action validates that client-side rather than letting Cursor's
 * generic 400 stand in for it.
 *
 * Two documented constraints that make this fail for reasons that have
 * nothing to do with the request being malformed: at least one PAID member
 * and at least one ADMIN (owner or free-owner) must remain on the team after
 * removal.
 */
const memberRemove: ActionDefinition<Input> = {
  key: "member-remove",
  type: "perform",
  resource: "member",
  title: "Remove Team Member",
  description: "Remove a member from your team. Useful for automating offboarding workflows or " +
    "integrating with HR systems.",
  idempotent: true,
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Email address of the team member. Required if User ID is not provided.",
    },
    {
      key: "userId",
      label: "User ID",
      type: "string",
      hint: "Encoded user id (e.g. user_PDSPmvukpYgZEDXsoNirw3CFhy). Required if Email is not " +
        "provided.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "userId", type: "string", label: "Removed user's id" },
    { key: "hasBillingCycleUsage", type: "boolean", label: "Had usage this billing cycle" },
  ],

  execute(input, ctx) {
    const email = input.email?.trim();
    const userId = input.userId?.trim();
    if (!email && !userId) throw new Error("Provide either email or userId");
    if (email && userId) throw new Error("Provide only one of email or userId, not both");

    return new CursorClient(ctx).post<RemoveMemberResponse>(
      "/teams/remove-member",
      email ? { email } : { userId },
    );
  },
};

export default memberRemove;
