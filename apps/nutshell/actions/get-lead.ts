import type { ActionDefinition } from "@w6w/types";
import { NutshellClient, type NutshellEntity, toId } from "../lib/client.ts";

interface Input {
  leadId: string | number;
}

/**
 * `getLead(leadId, rev?)` — one Lead by ID.
 *
 * Nutshell's own docs flag a trap worth restating here: "a lead's ID is not
 * always the same as the number shown when viewing the lead on the Nutshell
 * website" (e.g. `Lead-1000`). To look a lead up by the number a user sees,
 * use Find Leads with the `number` query key instead.
 *
 * `rev` is deliberately not exposed as an input: passing a cached `rev` here
 * only changes the response to a `{"_notModified": true}` stub when nothing
 * changed, which is a caching optimization this app has no cache to benefit
 * from — omitting it always returns the current full record.
 */
const getLead: ActionDefinition<Input, NutshellEntity> = {
  key: "get-lead",
  type: "read",
  resource: "lead",
  title: "Get Lead",
  description: "Fetch one Lead by its internal ID. Note this is NOT the same as the Lead number " +
    'shown on the website (e.g. "Lead-1000") — use Find Leads with a number query for that.',
  params: [
    { key: "leadId", label: "Lead ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Lead ID" },
    { key: "rev", type: "string", label: "Rev (needed to later update this Lead)" },
    { key: "name", type: "string", label: "Name" },
    {
      key: "status",
      type: "number",
      label: "Status (0=open, 1=pending, 10=won, 11=lost, 12=cancelled)",
    },
  ],

  execute(input, ctx) {
    return new NutshellClient(ctx).call<NutshellEntity>("getLead", { leadId: toId(input.leadId) });
  },
};

export default getLead;
