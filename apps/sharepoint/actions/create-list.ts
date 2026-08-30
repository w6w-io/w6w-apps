import type { ActionDefinition } from "@w6w/types";
import { compact, GraphClient, sitePath } from "../lib/client.ts";
import { listMetaOutput, siteParams } from "../lib/params.ts";

interface ColumnDefinition {
  name: string;
  text?: Record<string, unknown>;
  number?: Record<string, unknown>;
  boolean?: Record<string, unknown>;
  dateTime?: Record<string, unknown>;
  choice?: Record<string, unknown>;
}

interface Input {
  siteId?: string;
  hostname?: string;
  path?: string;
  displayName: string;
  template?: string;
  columns?: ColumnDefinition[];
}

/**
 * `POST /sites/{site-id}/lists`
 *
 * https://learn.microsoft.com/en-us/graph/api/list-create
 *
 * "In addition to any columns specified here, new lists are created with
 * columns defined in the referenced template. If the `list` facet or
 * `template` is unspecified, the list defaults to the `genericList` template,
 * which includes a `Title` column." The `listInfo` resource documents
 * `template` as an open-ended enumeration — `documentLibrary`, `genericList`,
 * `tasks`, `survey`, `links`, `announcements`, `contacts` and more — so this
 * offers a free-text field with the common values in its hint rather than a
 * closed dropdown.
 *
 * Custom `columns` are optional and each is a `columnDefinition`: a `name`
 * plus exactly one type facet (`text: {}`, `number: {}`, …), matching the
 * reference's own request body.
 *
 * Returns `201 Created` and the new `list` object.
 *
 * Least privileged delegated permission: `Sites.Manage.All` — **not**
 * `Sites.ReadWrite.All`, which the reference's own permission table lists as
 * "Not available" for this call. Not supported for a personal Microsoft
 * account.
 */
const createList: ActionDefinition<Input> = {
  key: "create-list",
  type: "perform",
  resource: "list",
  title: "Create List",
  description: "Create a new list in a site.",
  // A repeat run with the same name mints a second list — Graph names lists
  // by a generated internal name and does not treat displayName as a key.
  idempotent: false,
  params: [
    ...siteParams(),
    {
      key: "displayName",
      label: "Display name",
      type: "string",
      required: true,
      placeholder: "Books",
    },
    {
      key: "template",
      label: "Template",
      type: "string",
      default: "genericList",
      advanced: true,
      hint:
        "Base list template. Common documented values: `genericList`, `documentLibrary`, `tasks`, `survey`, `links`, `announcements`, `contacts` — the reference notes more exist. Defaults to `genericList`, which includes a `Title` column.",
    },
    {
      key: "columns",
      label: "Custom columns",
      type: "json",
      advanced: true,
      hint:
        'Optional array of `columnDefinition` objects, e.g. `[{"name":"Author","text":{}},{"name":"PageCount","number":{}}]`. Added alongside whatever columns the template itself defines.',
    },
  ],
  output: listMetaOutput,

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    return await client.request(`${sitePath(input)}/lists`, {
      method: "POST",
      body: compact({
        displayName: input.displayName,
        columns: input.columns,
        list: { template: input.template || "genericList" },
      }),
    });
  },
};

export default createList;
