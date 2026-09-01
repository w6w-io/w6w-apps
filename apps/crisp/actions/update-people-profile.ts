import type { ActionDefinition } from "@w6w/types";
import { compact, CrispClient, csv } from "../lib/client.ts";

interface Input {
  peopleId: string;
  email?: string;
  nickname?: string;
  phone?: string;
  address?: string;
  companyName?: string;
  segments?: string;
  notepad?: string;
}

type Output = Record<string, never>;

/**
 * `PATCH /v1/website/{website_id}/people/profile/{people_id}` — updates a
 * people (contact) profile; per the reference, "save only changed fields on
 * the previous profile revision". Same field subset as `create-people-
 * profile`, all optional here. Confirmed via the reference's embedded
 * example: `200 {"error": false, "reason": "updated", "data": {}}`, and a
 * `409 people_email_exists` if the new email collides with another profile.
 */
const updatePeopleProfile: ActionDefinition<Input, Output | undefined> = {
  key: "update-people-profile",
  type: "perform",
  resource: "people",
  title: "Update People Profile",
  description: "Updates fields on an existing contact (people) profile.",
  idempotent: true,
  params: [
    {
      key: "peopleId",
      label: "People ID or email",
      type: "string",
      required: true,
    },
    { key: "email", label: "Email", type: "string" },
    { key: "nickname", label: "Nickname", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "address", label: "Address", type: "string" },
    { key: "companyName", label: "Company name", type: "string" },
    {
      key: "segments",
      label: "Segments",
      type: "string",
      hint: "Comma-separated list. Replaces the existing segment list.",
    },
    { key: "notepad", label: "Notepad", type: "text" },
  ],
  output: [],

  execute(input, ctx) {
    const client = new CrispClient(ctx);
    const person = compact({
      nickname: input.nickname,
      phone: input.phone,
      address: input.address,
    });
    return client.request<Output>(
      `/people/profile/${encodeURIComponent(input.peopleId)}`,
      {
        method: "PATCH",
        body: {
          ...compact({ email: input.email }),
          ...(Object.keys(person).length ? { person } : {}),
          ...compact({
            company: input.companyName ? { name: input.companyName } : undefined,
            segments: csv(input.segments),
            notepad: input.notepad,
          }),
        },
      },
    );
  },
};

export default updatePeopleProfile;
