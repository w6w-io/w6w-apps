import type { ActionDefinition } from "@w6w/types";
import { compact, HeartbeatClient } from "../lib/client.ts";

/**
 * `POST /v0/users` — update a member's profile, addressed by email.
 *
 * `completedLessons` is additive-only: Heartbeat documents that lessons named
 * here are added to the member's completed list, and this call "will never
 * cause a lesson to be removed" — so calling it twice with the same lesson id
 * is safe (a set union, not a duplicate entry). Combined with the fact that
 * every other field here is a plain overwrite, a retry of this whole action
 * reaches the same end state, which is why it is marked idempotent.
 *
 * No response schema is documented for this endpoint; whatever body (if any)
 * comes back is passed through unshaped.
 */
interface Input {
  email: string;
  name?: string;
  bio?: string;
  status?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  completedLessonID?: string;
}

const updateUser: ActionDefinition<Input> = {
  key: "update-user",
  type: "perform",
  resource: "user",
  title: "Update User",
  description: "Update a member's profile fields, addressed by email. Only provided fields change.",
  idempotent: true,
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      hint: "Identifies the member to update. A 404 is returned if no member has this email.",
    },
    { key: "name", label: "Full name", type: "string" },
    { key: "bio", label: "Bio", type: "text" },
    { key: "status", label: "Status", type: "string" },
    { key: "linkedin", label: "LinkedIn URL", type: "string" },
    { key: "twitter", label: "Twitter/X URL", type: "string" },
    { key: "instagram", label: "Instagram URL", type: "string" },
    {
      key: "completedLessonID",
      label: "Mark lesson completed (Lesson ID)",
      type: "string",
      hint: "Additive only — Heartbeat never removes a lesson from a member's completed list via " +
        "this endpoint.",
    },
  ],
  output: [],

  execute(input, ctx) {
    return new HeartbeatClient(ctx).json("/users", {
      method: "POST",
      body: compact({
        email: input.email,
        name: input.name,
        bio: input.bio,
        status: input.status,
        linkedin: input.linkedin,
        twitter: input.twitter,
        instagram: input.instagram,
        completedLessons: input.completedLessonID
          ? [{ lessonID: input.completedLessonID }]
          : undefined,
      }),
    });
  },
};

export default updateUser;
