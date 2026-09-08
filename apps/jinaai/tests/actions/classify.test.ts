import { assertEquals, assertRejects } from "@std/assert";
import classify from "../../actions/classify.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("classify: zero-shot form sends model + labels + input", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], usage: {} } }]);
  await classify.execute(
    { model: "jina-embeddings-v3", labels: ["positive", "negative"], input: "great product" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/classify");
  assertEquals(JSON.parse(calls[0].body!), {
    input: "great product",
    model: "jina-embeddings-v3",
    labels: ["positive", "negative"],
  });
});

Deno.test("classify: few-shot form sends classifier_id + input only", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], usage: {} } }]);
  await classify.execute({ classifierId: "clf-1", input: "great product" }, ctx);

  assertEquals(JSON.parse(calls[0].body!), { input: "great product", classifier_id: "clf-1" });
});

Deno.test("classify: zero-shot form rejects a missing model", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => {
    await classify.execute({ labels: ["a"], input: "x" }, ctx);
  });
});

Deno.test("classify: zero-shot form rejects missing labels", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => {
    await classify.execute({ model: "jina-embeddings-v3", input: "x" }, ctx);
  });
});
