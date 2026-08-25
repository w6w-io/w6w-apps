import type { ActionDefinition } from "@w6w/types";
import { organizationKeyParam } from "../lib/params.ts";
import { encodeId, StreakClient } from "../lib/client.ts";

/**
 * `POST /organizations/{organizationKey}` — edit an organization.
 *
 * `domains`, `phoneNumbers` and `addresses` are typed `string` in the
 * vendor's own request schema — with NO `format: "json"` marker and no
 * encoding example, unlike `box-update`'s `fields` — even though `GET
 * /organizations/{key}` returns all three as JSON **arrays**
 * (`"domains": ["kittensrus.com"]`). That is either a doc bug (the field
 * really takes an array) or a genuine asymmetry between read and write.
 * Unconfirmed either way, so this action sends exactly the documented
 * `string` type rather than guessing a JSON-array encoding the spec never
 * states — verify the result with `organization-get` after writing one of
 * these fields.
 */
interface Input {
  organizationKey: string;
  name?: string;
  industry?: string;
  domains?: string;
  phoneNumbers?: string;
  addresses?: string;
  employeeCount?: string;
  logoURL?: string;
  other?: string;
}

const organizationUpdate: ActionDefinition<Input> = {
  key: "organization-update",
  type: "perform",
  resource: "organization",
  title: "Update Organization",
  description: "Edit an organization's name, industry or contact details.",
  idempotent: true,
  params: [
    organizationKeyParam,
    { key: "name", label: "Name", type: "string" },
    { key: "industry", label: "Industry", type: "string" },
    {
      key: "domains",
      label: "Domains",
      type: "string",
      hint: "Documented as a plain string on write despite reading back as an array — see the " +
        "note in organization-update.ts.",
    },
    { key: "phoneNumbers", label: "Phone Numbers", type: "string" },
    { key: "addresses", label: "Addresses", type: "string" },
    { key: "employeeCount", label: "Employee Count", type: "string", advanced: true },
    { key: "logoURL", label: "Logo URL", type: "string", advanced: true },
    { key: "other", label: "Notes", type: "text", advanced: true },
  ],
  output: [{ key: "data", type: "object", label: "The updated organization" }],

  execute(input, ctx) {
    const { organizationKey, ...body } = input;
    return new StreakClient(ctx).sendJson(
      "POST",
      `/organizations/${encodeId(organizationKey)}`,
      body,
    );
  },
};

export default organizationUpdate;
