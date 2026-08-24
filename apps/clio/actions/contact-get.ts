import type { ActionDefinition } from "@w6w/types";
import { ClioClient } from "../lib/client.ts";
import { fieldsParam, idParam } from "../lib/params.ts";

/** `GET /contacts/{id}.json` */
interface Input {
  id: number;
  fields?: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch one contact by id.",
  params: [
    idParam("Contact ID"),
    fieldsParam(
      "id,etag,name,type,first_name,last_name,primary_email_address,primary_phone_number,is_client",
    ),
  ],
  output: [{ key: "data", type: "object", label: "The contact" }],

  execute(input, ctx) {
    return new ClioClient(ctx).data(`/contacts/${input.id}.json`, {
      query: { fields: input.fields },
    });
  },
};

export default contactGet;
