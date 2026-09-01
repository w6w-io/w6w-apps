import type { ActionDefinition } from "@w6w/types";
import { CrispClient } from "../lib/client.ts";

interface Input {
  peopleId: string;
}

export interface CrispPeopleProfile {
  people_id?: string;
  email?: string;
  person?: {
    nickname?: string;
    phone?: string;
    address?: string;
    description?: string;
    website?: string;
  };
  company?: { name?: string };
  segments?: string[];
  notepad?: string;
  created_at?: number;
  updated_at?: number;
}

/**
 * `GET /v1/website/{website_id}/people/profile/{people_id}` — resolves one
 * people (contact) profile. Per the reference, `people_id` also accepts the
 * profile's email address in place of its UUID.
 */
const getPeopleProfile: ActionDefinition<Input, CrispPeopleProfile | undefined> = {
  key: "get-people-profile",
  type: "read",
  resource: "people",
  title: "Get People Profile",
  description: "Resolves a contact (people) profile by ID or email.",
  params: [
    {
      key: "peopleId",
      label: "People ID or email",
      type: "string",
      required: true,
    },
  ],
  output: [
    { key: "people_id", type: "string", label: "People ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "segments", type: "array", label: "Segments" },
  ],

  execute(input, ctx) {
    const client = new CrispClient(ctx);
    return client.request<CrispPeopleProfile>(
      `/people/profile/${encodeURIComponent(input.peopleId)}`,
    );
  },
};

export default getPeopleProfile;
