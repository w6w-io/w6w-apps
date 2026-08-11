import { assert, assertEquals } from "@std/assert";
import datasetList from "../../actions/dataset-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("dataset-list: calls GET /v2/datasets and unwraps the page", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "d1", name: "results" }]) }]);
  const out = await datasetList.execute({ limit: 100 }, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/datasets");
  assertEquals(out.items, [{ id: "d1", name: "results" }]);
});

/**
 * Apify returns **named storages only** unless `unnamed=1` is passed, and every
 * dataset an Actor run creates for itself is unnamed. Sending the flag by
 * default would change the vendor's semantics; not exposing it at all would
 * leave an empty list looking like a bug.
 */
Deno.test("dataset-list: unnamed storages are excluded unless asked for", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }, { body: listEnvelope([]) }]);
  await datasetList.execute({}, ctx);
  assert(!("unnamed" in queryOf(calls[0].url)));

  await datasetList.execute({ unnamed: true }, ctx);
  assertEquals(queryOf(calls[1].url).unnamed, "1");
});

Deno.test("dataset-list: ownership is passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await datasetList.execute({ ownership: "ownedByMe" }, ctx);
  assertEquals(queryOf(calls[0].url).ownership, "ownedByMe");
});

/**
 * The list projection carries no signing key today. The strip is applied anyway
 * so the rule is about the shape rather than about which action remembered — if
 * Apify ever widens the projection, this already holds.
 */
Deno.test("dataset-list: a signing key in a list item would still be stripped", async () => {
  const { ctx } = mockCtx([
    { body: listEnvelope([{ id: "d1", urlSigningSecretKey: "hmac-key-do-not-leak" }]) },
  ]);
  const out = await datasetList.execute({}, ctx) as { items: Array<Record<string, unknown>> };
  assertEquals(out.items[0].id, "d1");
  assertEquals("urlSigningSecretKey" in out.items[0], false);
  assert(!JSON.stringify(out).includes("hmac-key-do-not-leak"));
});
