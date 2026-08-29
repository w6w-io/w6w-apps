import type { ActionDefinition } from "@w6w/types";
import { KustomerClient } from "../lib/client.ts";
import { listOutput, pagination } from "../lib/params.ts";

interface Input {
  name: string;
  page?: number;
  pageSize?: number;
  sort?: string;
}

/**
 * `GET /v1/klasses/{name}` — "Get KObjects (custom objects)", verified
 * against the Core Resources OAS. `name` is the Klass's machine name (see
 * `klass-list`), not a KObject id.
 */
const kobjectList: ActionDefinition<Input> = {
  key: "kobject-list",
  type: "read",
  resource: "kobject",
  title: "List KObjects",
  description: "List the custom-object records (KObjects) of one Klass.",
  params: [
    {
      key: "name",
      label: "Klass name",
      type: "string",
      required: true,
      hint: "The Klass's machine name, e.g. `order` — see List Klasses.",
    },
    ...pagination,
    {
      key: "sort",
      label: "Sort",
      type: "string",
      advanced: true,
      hint: "A field name, e.g. `createdAt`. Prefix with `-` for descending.",
    },
  ],
  output: listOutput,

  execute(input, ctx) {
    return new KustomerClient(ctx).json(`/klasses/${encodeURIComponent(input.name)}`, {
      query: { page: input.page, pageSize: input.pageSize, sort: input.sort },
    });
  },
};

export default kobjectList;
