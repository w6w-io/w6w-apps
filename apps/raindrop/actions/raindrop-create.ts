import type { ActionDefinition } from "@w6w/types";
import { RaindropClient, toList } from "../lib/client.ts";
import { buildRaindropBody, type RaindropBodyInput, raindropBodyParams } from "../lib/params.ts";

/**
 * `POST /rest/v1/raindrop` — save one bookmark.
 *
 * **Singular**; `/raindrops` is the batch route and takes a different body
 * (`{items: […]}`).
 *
 * `link` is the only required field. Everything else is optional, and the useful
 * default is to send almost nothing and turn on **Parse metadata**
 * (`pleaseParse`), which asks Raindrop to fetch the page in the background and
 * fill in title, description, cover and type. The response returns *before* that
 * finishes, so a workflow that immediately reads `title` off the result will see
 * whatever was sent, not what was parsed. Re-read the raindrop a moment later if
 * the parsed metadata is what you need.
 *
 * Not idempotent. Raindrop accepts no idempotency key and does not deduplicate
 * on `link` — saving the same URL twice produces two bookmarks (its duplicate
 * detection is a *report*, surfaced by Get Filters, not a constraint). A retried
 * create is a second bookmark, so the runtime must not replay this.
 *
 * Use Check URLs Saved first if "only if not already saved" is what you mean.
 */
type Input = RaindropBodyInput & { link: string };

const raindropCreate: ActionDefinition<Input> = {
  key: "raindrop-create",
  type: "perform",
  resource: "raindrop",
  title: "Create Raindrop",
  description:
    "Save one bookmark. Only the URL is required; turn on Parse metadata to let Raindrop fill in " +
    "the title, description and cover in the background.",
  idempotent: false,
  params: raindropBodyParams(true),
  output: [{ key: "item", type: "object", label: "Created raindrop" }],

  async execute(input, ctx) {
    const body = buildRaindropBody(input, toList(input.tags));
    if (!body.link) throw new Error("URL is required");

    return { item: await new RaindropClient(ctx).item("/raindrop", { method: "POST", body }) };
  },
};

export default raindropCreate;
