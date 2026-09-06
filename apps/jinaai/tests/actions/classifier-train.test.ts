import { assertEquals, assertRejects } from "@std/assert";
import classifierTrain from "../../actions/classifier-train.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("classifier-train: create form sends model + input + access + numIters", async () => {
  const { ctx, calls } = mockCtx([{ body: { classifier_id: "clf-1", num_samples: 2 } }]);
  const input = [{ text: "a", label: "x" }, { text: "b", label: "y" }];
  await classifierTrain.execute(
    { model: "jina-embeddings-v3", input, access: "private", numIters: 20 },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/train");
  assertEquals(JSON.parse(calls[0].body!), {
    input,
    model: "jina-embeddings-v3",
    access: "private",
    num_iters: 20,
  });
});

Deno.test("classifier-train: update form sends classifier_id + input only", async () => {
  const { ctx, calls } = mockCtx([{ body: { classifier_id: "clf-1", num_samples: 1 } }]);
  const input = [{ text: "more", label: "x" }];
  await classifierTrain.execute({ classifierId: "clf-1", input }, ctx);

  assertEquals(JSON.parse(calls[0].body!), { input, classifier_id: "clf-1" });
});

Deno.test("classifier-train: create form rejects a missing model", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => {
    await classifierTrain.execute({ input: [{ text: "a", label: "x" }] }, ctx);
  });
});
