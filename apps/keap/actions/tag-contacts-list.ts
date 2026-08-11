import type { ActionDefinition } from "@w6w/types";
import { encodeId, eq, joinFilters, KeapClient, nextPageToken, V2 } from "../lib/client.ts";
import { filterParam, orderByParam, pageParams } from "../lib/params.ts";

/**
 * `GET /rest/v2/tags/{tag_id}/contacts` — List Tagged Contacts.
 *
 * Rows are `TaggedContact` — a deliberately thin projection of a contact
 * (`id`, `email`, `given_name`, `family_name`) plus `applied_time`. There is no
 * `fields` parameter here, so this cannot be widened into a full contact read;
 * fetch the ids and call Get Contact if you need more.
 *
 * `NONE` is a documented sentinel on three of the clauses: "If NONE is passed
 * in for `email`, `given_name`, or `family_name`, it will check for the
 * non-existence of that field" — i.e. `email==NONE` finds tagged contacts with
 * no email address, which is the only way to ask that question here.
 */
interface Input {
  tagId: string;
  givenName?: string;
  familyName?: string;
  email?: string;
  sinceAppliedTime?: string;
  untilAppliedTime?: string;
  filter?: string;
  orderBy?: string;
  pageSize?: number;
  pageToken?: string;
}

const tagContactsList: ActionDefinition<Input> = {
  key: "tag-contacts-list",
  type: "search",
  title: "List Contacts with Tag",
  resource: "tag",
  description: "List the contacts carrying a tag, with the time it was applied to each.",
  params: [
    { key: "tagId", label: "Tag ID", type: "string", required: true },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Pass `NONE` to find tagged contacts that have no email address.",
    },
    { key: "givenName", label: "First name", type: "string" },
    { key: "familyName", label: "Last name", type: "string" },
    { key: "sinceAppliedTime", label: "Applied since", type: "datetime", advanced: true },
    { key: "untilAppliedTime", label: "Applied until", type: "datetime", advanced: true },
    filterParam,
    orderByParam(
      "One of `given_name`, `family_name`, `email`, `applied_time`, plus `asc` or `desc`.",
    ),
    ...pageParams(),
  ],
  output: [
    { key: "contacts", type: "array", label: "Tagged contacts" },
    { key: "count", type: "number", label: "Contacts returned" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const filter = joinFilters([
      eq("email", input.email),
      eq("given_name", input.givenName),
      eq("family_name", input.familyName),
      eq("since_applied_time", input.sinceAppliedTime),
      eq("until_applied_time", input.untilAppliedTime),
      input.filter,
    ]);

    const client = new KeapClient(ctx);
    const body = await client.json<{ contacts?: unknown[]; next_page_token?: string }>(
      `${V2}/tags/${encodeId(input.tagId)}/contacts`,
      {
        query: {
          filter,
          order_by: input.orderBy,
          page_size: input.pageSize,
          page_token: input.pageToken,
        },
      },
    );
    const contacts = body?.contacts ?? [];
    return { contacts, count: contacts.length, nextPageToken: nextPageToken(body) };
  },
};

export default tagContactsList;
