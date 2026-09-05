import type { ActionDefinition } from "@w6w/types";
import { ZohoCampaignsClient } from "../lib/client.ts";

interface Input {
  cvid: string;
}

interface Output {
  contacts: Array<Record<string, unknown>>;
}

/**
 * `GET /getsegmentcontacts` — verified against
 * `https://www.zoho.com/campaigns/help/developers/get-segment-contacts.html`.
 */
const segmentGetContacts: ActionDefinition<Input, Output> = {
  key: "segment-get-contacts",
  type: "read",
  resource: "segment",
  title: "Get Segment Contacts",
  description: "List the contacts matching a segment's filter criteria.",
  params: [
    {
      key: "cvid",
      label: "Segment ID (cvid)",
      type: "string",
      required: true,
      hint: "From a mailing list's `segments` field (see List Mailing Lists).",
    },
  ],
  output: [{ key: "contacts", type: "array", label: "Contacts" }],

  async execute(input, ctx) {
    const body = await new ZohoCampaignsClient(ctx).request<
      { segment_contacts?: Array<Record<string, unknown>> }
    >("getsegmentcontacts", { query: { cvid: input.cvid } });
    return { contacts: body.segment_contacts ?? [] };
  },
};

export default segmentGetContacts;
