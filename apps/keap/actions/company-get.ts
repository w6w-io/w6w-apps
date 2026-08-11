import type { ActionDefinition } from "@w6w/types";
import { encodeId, KeapClient, V2 } from "../lib/client.ts";
import { fieldsParam } from "../lib/params.ts";

/**
 * `GET /rest/v2/companies/{company_id}` — Retrieve a Company.
 *
 * `groups` on the response is a **comma-delimited string of tag ids**
 * ("1,5,12"), not an array and not a list of names. A Contact carries the same
 * information twice — `groups` as that string *and* `tag_ids` as a real array —
 * but a Company gets only the string form, so splitting it is the caller's job.
 *
 * (Keap also publishes `GET /rest/v2/companies/{company_id}/tags` for the same
 * relationship in richer form. It is not modelled as an action here — see the
 * README's "not covered" list.)
 */
interface Input {
  companyId: string;
  fields?: string;
}

const companyGet: ActionDefinition<Input> = {
  key: "company-get",
  type: "read",
  title: "Get Company",
  resource: "company",
  description: "Retrieve a single company by id.",
  params: [
    { key: "companyId", label: "Company ID", type: "string", required: true },
    fieldsParam(
      "Available: `address`, `custom_fields`, `email_address`, `fax_number`, `phone_number`, " +
        "`website`, `notes`. None is returned unless named here.",
    ),
  ],
  output: [
    { key: "id", type: "string", label: "Company ID" },
    { key: "company_name", type: "string", label: "Name" },
    { key: "groups", type: "string", label: "Applied tag IDs (comma-delimited)" },
  ],

  execute(input, ctx) {
    const client = new KeapClient(ctx);
    return client.json(`${V2}/companies/${encodeId(input.companyId)}`, {
      query: { fields: input.fields },
    });
  },
};

export default companyGet;
