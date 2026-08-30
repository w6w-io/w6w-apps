import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, VideoAskClient } from "../lib/client.ts";
import { organizationIdParam, respondentIdParam } from "../lib/params.ts";

/** `PATCH /respondents/{respondent_id}` — update a contact's own fields. */
interface Input {
  respondentId: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  organizationId?: string;
}

const respondentUpdate: ActionDefinition<Input> = {
  key: "respondent-update",
  type: "perform",
  resource: "respondent",
  title: "Update Contact",
  description: "Update a respondent (contact)'s name, email or phone number.",
  idempotent: true,
  params: [
    respondentIdParam,
    { key: "name", label: "Name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "phoneNumber", label: "Phone number", type: "string" },
    organizationIdParam,
  ],
  output: [{ key: "result", type: "object", label: "The updated contact" }],

  async execute(input, ctx) {
    const result = await new VideoAskClient(ctx).entity(
      `/respondents/${encodeId(input.respondentId)}`,
      {
        method: "PATCH",
        body: compact({ name: input.name, email: input.email, phone_number: input.phoneNumber }),
        organizationId: input.organizationId,
      },
    );
    return { result };
  },
};

export default respondentUpdate;
