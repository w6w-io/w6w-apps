import { assertEquals } from "@std/assert";
import getContentClassificationLabels from "../../actions/get-content-classification-labels.ts";
import { settableCclOptions } from "../../lib/params.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-content-classification-labels: calls GET /helix/content_classification_labels", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ id: "Gambling", name: "Gambling", description: "…" }] },
  }]);
  const out = await getContentClassificationLabels.execute({}, ctx) as {
    data: Array<{ id: string }>;
  };

  assertEquals(pathOf(calls[0].url), "/helix/content_classification_labels");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.data[0].id, "Gambling");
});

Deno.test("get-content-classification-labels: locale is forwarded when given", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await getContentClassificationLabels.execute({ locale: "de-DE" }, ctx);
  assertEquals(queryOf(calls[0].url), { locale: "de-DE" });
});

/**
 * Seven labels are READABLE, six are SETTABLE — `MatureGame` is applied by
 * Twitch from the category. The write path must not offer it.
 */
Deno.test("get-content-classification-labels: the settable list excludes MatureGame", () => {
  assertEquals(settableCclOptions.length, 6);
  assertEquals(settableCclOptions.some((o) => o.value === "MatureGame"), false);
});
