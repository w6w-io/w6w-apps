import type { ActionDefinition } from "@w6w/types";
import { encodeId, eq, joinFilters, KeapClient, nextPageToken, V2 } from "../lib/client.ts";
import { filterParam, orderByParam, pageParams } from "../lib/params.ts";

/**
 * `GET /rest/v2/contacts/{contact_id}/tags` — List Applied Tags.
 *
 * The rows are `AppliedTag`, not `Tag`: each is `{tag: {...}, applied_time}`,
 * so the tag's own id is at `tags[i].tag.id` and not at `tags[i].id`. The
 * response key is `tags` either way, which is exactly the shape that makes the
 * mistake easy — hence the flattened `tagIds` output below.
 *
 * Note the asymmetry with the reverse direction: this returns the tag wrapped
 * with its application time, while `GET /rest/v2/tags/{tag_id}/contacts`
 * returns a flat `TaggedContact` with `applied_time` alongside the contact's
 * own fields. Same relationship, two different shapes.
 */
interface Input {
  contactId: string;
  name?: string;
  categoryId?: string;
  filter?: string;
  orderBy?: string;
  pageSize?: number;
  pageToken?: string;
}

interface AppliedTag {
  tag?: { id?: string; name?: string };
  applied_time?: string;
}

const contactTagsList: ActionDefinition<Input> = {
  key: "contact-tags-list",
  type: "read",
  title: "List Contact Tags",
  resource: "contact",
  description: "List the tags applied to a contact, with the time each was applied.",
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    { key: "name", label: "Tag name", type: "string" },
    {
      key: "categoryId",
      label: "Category ID",
      type: "string",
      hint: "Use `NONE` to list only tags that belong to no category.",
    },
    filterParam,
    orderByParam(
      "One of `name`, `create_time`, `update_time`, `applied_time`, `category_id`, plus `asc` " +
        "or `desc`.",
    ),
    ...pageParams(),
  ],
  output: [
    { key: "tags", type: "array", label: "Applied tags" },
    { key: "tagIds", type: "array", label: "Tag IDs" },
    { key: "count", type: "number", label: "Tags returned" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const filter = joinFilters([
      eq("name", input.name),
      eq("category_id", input.categoryId),
      input.filter,
    ]);

    const client = new KeapClient(ctx);
    const body = await client.json<{ tags?: AppliedTag[]; next_page_token?: string }>(
      `${V2}/contacts/${encodeId(input.contactId)}/tags`,
      {
        query: {
          filter,
          order_by: input.orderBy,
          page_size: input.pageSize,
          page_token: input.pageToken,
        },
      },
    );

    const tags = body?.tags ?? [];
    return {
      tags,
      // The id is one level deeper than the response key suggests.
      tagIds: tags.map((t) => t?.tag?.id).filter((id): id is string => typeof id === "string"),
      count: tags.length,
      nextPageToken: nextPageToken(body),
    };
  },
};

export default contactTagsList;
