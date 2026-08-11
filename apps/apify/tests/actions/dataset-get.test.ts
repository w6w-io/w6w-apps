import { assert, assertEquals } from "@std/assert";
import datasetGet from "../../actions/dataset-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("dataset-get: calls GET /v2/datasets/{id} and unwraps data", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ id: "d1", name: "results", itemCount: 42, cleanItemCount: 40 }) },
  ]);
  const out = await datasetGet.execute({ datasetId: "d1" }, ctx) as { itemCount: number };

  assertEquals(pathOf(calls[0].url), "/v2/datasets/d1");
  assertEquals(out.itemCount, 42);
});

/**
 * `Dataset.urlSigningSecretKey` is the HMAC key that mints signed public URLs
 * for this dataset's contents — a live credential returned inside an ordinary
 * metadata read. An action result is persisted in the run record and echoed into
 * logs and previews, so returning it would be a durable leak.
 */
Deno.test("dataset-get: the URL-signing secret never reaches the caller", async () => {
  const { ctx } = mockCtx([
    {
      body: envelope({
        id: "d1",
        name: "results",
        itemCount: 42,
        urlSigningSecretKey: "hmac-key-do-not-leak",
      }),
    },
  ]);
  const out = await datasetGet.execute({ datasetId: "d1" }, ctx) as Record<string, unknown>;

  assertEquals("urlSigningSecretKey" in out, false);
  assert(
    !JSON.stringify(out).includes("hmac-key-do-not-leak"),
    "the signing key survived somewhere in the result",
  );
  // Everything else is untouched — the strip is narrow, not a scrub.
  assertEquals(out.id, "d1");
  assertEquals(out.name, "results");
  assertEquals(out.itemCount, 42);
});

Deno.test("dataset-get: the username~name form survives escaping", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "d1" }) }]);
  await datasetGet.execute({ datasetId: "me~results" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/datasets/me~results");
});
