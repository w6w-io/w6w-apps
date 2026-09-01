import type { ActionDefinition } from "@w6w/types";
import { AirtopClient } from "../lib/client.ts";
import { sessionIdParam } from "../lib/params.ts";

/**
 * `PUT /v1/sessions/{sessionId}/save-profile-on-termination/{profileName}` —
 * mark this session's cookies and local storage to be persisted as a named
 * profile when the session ends. This is the only documented, public way to
 * create a profile — Airtop has no `POST /v1/profiles`.
 *
 * `profileName` must be URL-safe; a name already in use is overwritten. `PUT`
 * against the same target twice is safe, hence `idempotent: true`.
 */
interface Input {
  sessionId: string;
  profileName: string;
}

const sessionSaveProfile: ActionDefinition<Input> = {
  key: "session-save-profile",
  type: "perform",
  resource: "session",
  title: "Save Profile on Termination",
  description: "Persist this session's cookies and local storage as a named profile when it ends.",
  idempotent: true,
  params: [
    sessionIdParam,
    {
      key: "profileName",
      label: "Profile name",
      type: "string",
      required: true,
      hint: "A name already in use is overwritten. Load it back into a future session with " +
        "the 'profileName' field on Create Session.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "sessionId", type: "string", label: "Session ID" },
    { key: "profileName", type: "string", label: "Profile name" },
  ],

  async execute(input, ctx) {
    await new AirtopClient(ctx).status(
      `/v1/sessions/${encodeURIComponent(input.sessionId)}/save-profile-on-termination/${
        encodeURIComponent(input.profileName)
      }`,
      { method: "PUT" },
    );
    return { success: true, sessionId: input.sessionId, profileName: input.profileName };
  },
};

export default sessionSaveProfile;
