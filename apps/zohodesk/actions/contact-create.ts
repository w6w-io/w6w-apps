import type { ActionDefinition } from "@w6w/types";
import { deskCreate, type DeskCreateInput } from "../lib/desk.ts";
import { dataFields, orgId } from "../lib/params.ts";

const contactCreate: ActionDefinition<DeskCreateInput> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    '`lastName` is required, e.g. { "lastName": "Carol", "email": "carol@zylker.com" }. Field ' +
    "names are camelCase (lastName, firstName), unlike Zoho Books' snake_case.",
  idempotent: false,
  params: [dataFields, orgId],
  output: [{ key: "id", type: "string", label: "Contact ID" }],

  execute(input, ctx) {
    return deskCreate(ctx, "/contacts", input);
  },
};

export default contactCreate;
