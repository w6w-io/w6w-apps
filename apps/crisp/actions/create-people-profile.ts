import type { ActionDefinition } from "@w6w/types";
import { compact, CrispClient, csv } from "../lib/client.ts";

interface Input {
  email: string;
  nickname: string;
  phone?: string;
  address?: string;
  companyName?: string;
  segments?: string;
  notepad?: string;
}

export interface CrispNewPeopleProfile {
  people_id?: string;
}

/**
 * `POST /v1/website/{website_id}/people/profile` — creates a new people
 * (contact) profile. `email` and `person.nickname` are the only required
 * fields per the reference; the profile schema is much larger (employment,
 * geolocation, online profiles, company metrics) — this action exposes the
 * fields a workflow is most likely to set at creation time. Confirmed via
 * the reference's embedded example: `{"email": "...", "person": {"nickname":
 * "..."}}` -> `201 {"error": false, "reason": "added", "data": {"people_id":
 * "..."}}`, and a `409 people_exists` when the email is already known.
 */
const createPeopleProfile: ActionDefinition<Input, CrispNewPeopleProfile | undefined> = {
  key: "create-people-profile",
  type: "perform",
  resource: "people",
  title: "Create People Profile",
  description: "Creates a new contact (people) profile.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "nickname", label: "Nickname", type: "string", required: true },
    { key: "phone", label: "Phone", type: "string" },
    { key: "address", label: "Address", type: "string" },
    { key: "companyName", label: "Company name", type: "string" },
    {
      key: "segments",
      label: "Segments",
      type: "string",
      hint: "Comma-separated list, e.g. `lead, newsletter`.",
    },
    { key: "notepad", label: "Notepad", type: "text" },
  ],
  output: [{ key: "people_id", type: "string", label: "People ID" }],

  execute(input, ctx) {
    const client = new CrispClient(ctx);
    return client.request<CrispNewPeopleProfile>("/people/profile", {
      method: "POST",
      body: {
        email: input.email,
        person: compact({ nickname: input.nickname, phone: input.phone, address: input.address }),
        ...compact({
          company: input.companyName ? { name: input.companyName } : undefined,
          segments: csv(input.segments),
          notepad: input.notepad,
        }),
      },
    });
  },
};

export default createPeopleProfile;
