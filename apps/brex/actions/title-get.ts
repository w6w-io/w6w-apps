import type { ActionDefinition } from "@w6w/types";
import { BrexClient, type BrexTitle, encodeId } from "../lib/client.ts";
import { titleIdParam } from "../lib/params.ts";

/**
 * `GET /v2/titles/{id}` — one title by id.
 */
interface Input {
  id: string;
}

const titleGet: ActionDefinition<Input> = {
  key: "title-get",
  type: "read",
  resource: "title",
  title: "Get Title",
  description: "Fetch one Brex title by id.",
  params: [titleIdParam],
  output: [
    { key: "id", type: "string", label: "Title id" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new BrexClient(ctx).json<BrexTitle>(`/titles/${encodeId(input.id)}`);
  },
};

export default titleGet;
