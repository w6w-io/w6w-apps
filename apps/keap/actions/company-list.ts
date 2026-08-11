import type { ActionDefinition } from "@w6w/types";
import { eq, joinFilters, KeapClient, nextPageToken, V2 } from "../lib/client.ts";
import { fieldsParam, filterParam, orderByParam, pageParams } from "../lib/params.ts";

/**
 * `GET /rest/v2/companies` — List Companies.
 *
 * ## Two name filters that are not the same filter
 *
 * Keap declares both, and they behave differently: `company_name` is "exact
 * match on company name (equality only)" while `name` is "company name with
 * support for a wildcard at the end". Reaching for `company_name` with a
 * trailing `*` returns nothing at all, silently.
 *
 * ## Heavy properties are omitted unless requested
 *
 * "Fields such as `notes`, `fax_number`, `address`, `email_address`,
 * `phone_number`, `update_time`, `create_time` and `custom_fields` aren't
 * included, by default." An absent `email_address` on a listed company is
 * therefore not evidence that it has none.
 */
interface Input {
  name?: string;
  companyName?: string;
  email?: string;
  city?: string;
  state?: string;
  filter?: string;
  orderBy?: string;
  fields?: string;
  pageSize?: number;
  pageToken?: string;
}

const companyList: ActionDefinition<Input> = {
  key: "company-list",
  type: "search",
  title: "List Companies",
  resource: "company",
  description: "Search companies by name, email or address.",
  params: [
    {
      key: "name",
      label: "Name starts with",
      type: "string",
      hint: "Supports a trailing `*` for prefix matching. Use this rather than the exact-match " +
        "field below unless you have the full name.",
    },
    {
      key: "companyName",
      label: "Name (exact)",
      type: "string",
      hint: "Equality only — a trailing `*` here matches nothing.",
    },
    { key: "email", label: "Email (exact)", type: "string" },
    { key: "city", label: "City", type: "string", hint: "Supports a trailing `*`." },
    { key: "state", label: "State / region", type: "string" },
    filterParam,
    orderByParam("One of `id`, `create_time`, `name`, `email`, plus `asc` or `desc`."),
    fieldsParam(
      "Available: `address`, `custom_fields`, `email_address`, `fax_number`, `phone_number`, " +
        "`website`, `notes`. None of these is returned unless named here.",
    ),
    ...pageParams(),
  ],
  output: [
    { key: "companies", type: "array", label: "Companies" },
    { key: "count", type: "number", label: "Companies returned" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const filter = joinFilters([
      eq("name", input.name),
      eq("company_name", input.companyName),
      eq("email", input.email),
      eq("city", input.city),
      eq("state", input.state),
      input.filter,
    ]);
    const client = new KeapClient(ctx);
    const body = await client.json<{ companies?: unknown[]; next_page_token?: string }>(
      `${V2}/companies`,
      {
        query: {
          filter,
          order_by: input.orderBy,
          fields: input.fields,
          page_size: input.pageSize,
          page_token: input.pageToken,
        },
      },
    );
    const companies = body?.companies ?? [];
    return { companies, count: companies.length, nextPageToken: nextPageToken(body) };
  },
};

export default companyList;
