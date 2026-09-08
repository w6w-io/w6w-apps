import type { ActionDefinition } from "@w6w/types";
import { entityPath, JibbleClient, WORKSPACE_HOST } from "../lib/client.ts";

/**
 * `PATCH /v1/People(id)` — edit a member's profile fields.
 *
 * Answers `204 No Content` on success, per the collection's own "Edit Member" example — this
 * returns `{ ok: true }` rather than the updated record, since Jibble hands nothing back.
 * Use `member-archive` to remove a member instead of setting `status` through here.
 */
interface Input {
  personId: string;
  fullName?: string;
  preferredName?: string;
  email?: string;
  phoneNumber?: string;
  countryCode?: string;
  groupId?: string;
  scheduleId?: string;
}

const memberUpdate: ActionDefinition<Input> = {
  key: "member-update",
  type: "perform",
  resource: "member",
  title: "Update Member",
  description: "Edit a member's profile fields.",
  idempotent: true,
  params: [
    { key: "personId", label: "Person ID", type: "string", required: true },
    { key: "fullName", label: "Full name", type: "string" },
    { key: "preferredName", label: "Preferred name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "phoneNumber", label: "Phone number", type: "string" },
    {
      key: "countryCode",
      label: "Country code",
      type: "string",
      hint: "ISO 3166-1 alpha-2, e.g. US.",
    },
    { key: "groupId", label: "Group ID", type: "string" },
    { key: "scheduleId", label: "Schedule ID", type: "string" },
  ],
  output: [{ key: "ok", type: "boolean", label: "Updated" }],

  async execute(input, ctx) {
    if (!input.personId) throw new Error("personId is required");
    const body: Record<string, unknown> = {};
    if (input.fullName !== undefined) body.fullName = input.fullName;
    if (input.preferredName !== undefined) body.preferredName = input.preferredName;
    if (input.email !== undefined) body.email = input.email;
    if (input.phoneNumber !== undefined) body.phoneNumber = input.phoneNumber;
    if (input.countryCode !== undefined) body.countryCode = input.countryCode;
    if (input.groupId !== undefined) body.groupId = input.groupId;
    if (input.scheduleId !== undefined) body.scheduleId = input.scheduleId;
    if (Object.keys(body).length === 0) throw new Error("at least one field to update is required");

    const status = await new JibbleClient(ctx).status(
      WORKSPACE_HOST,
      entityPath("People", input.personId),
      { method: "PATCH", body },
    );
    return { ok: status >= 200 && status < 300 };
  },
};

export default memberUpdate;
