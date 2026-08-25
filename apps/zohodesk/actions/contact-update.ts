import type { ActionDefinition } from "@w6w/types";
import { deskUpdate, type DeskUpdateInput } from "../lib/desk.ts";
import { dataFields, orgId, recordId } from "../lib/params.ts";

const contactUpdate: ActionDefinition<DeskUpdateInput> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: 'Update fields on an existing contact, e.g. { "phone": "1 888 900 9646" }.',
  idempotent: true,
  params: [recordId, dataFields, orgId],
  output: [{ key: "id", type: "string", label: "Contact ID" }],

  execute(input, ctx) {
    return deskUpdate(ctx, "/contacts", input);
  },
};

export default contactUpdate;
