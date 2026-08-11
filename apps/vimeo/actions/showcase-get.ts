import type { ActionDefinition } from "@w6w/types";
import { idFromRef, toCsv, VimeoClient } from "../lib/client.ts";
import { fieldsParam, showcaseIdParam } from "../lib/params.ts";

/**
 * `GET /me/albums/{album_id}` — one showcase.
 *
 * See `showcase-list` for why the path says `albums` while the entity's URI
 * says `/showcases/`.
 *
 * A password-protected showcase returns `privacy.password` in cleartext, so the
 * `Fields` note on this action is not boilerplate: a workflow that fetches a
 * showcase and logs it has logged the password that gates it.
 */
interface Input {
  showcaseId: string;
  fields?: string;
}

const showcaseGet: ActionDefinition<Input> = {
  key: "showcase-get",
  type: "read",
  resource: "showcase",
  title: "Get Showcase",
  description: "Fetch a single showcase by ID.",
  params: [showcaseIdParam, fieldsParam],
  output: [
    { key: "uri", type: "string", label: "The showcase's canonical URI" },
    { key: "name", type: "string", label: "Showcase name" },
    { key: "total_clips", type: "number", label: "Number of videos in the showcase" },
  ],

  execute(input, ctx) {
    return new VimeoClient(ctx).request(
      `/me/albums/${idFromRef(input.showcaseId, "Showcase ID")}`,
      { query: { fields: toCsv(input.fields) } },
    );
  },
};

export default showcaseGet;
