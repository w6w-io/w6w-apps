import { assert, assertEquals } from "@std/assert";
import createGenerationFromTemplate from "../../actions/create-generation-from-template.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-generation-from-template: POSTs prompt + gammaId", async () => {
  const { ctx, calls } = mockCtx([{ body: { generationId: "gen2" } }]);
  const out = await createGenerationFromTemplate.execute(
    { prompt: "retarget for executives", gammaId: "g_template1" },
    ctx,
  ) as { generationId: string };

  assertEquals(pathOf(calls[0].url), "/v1.0/generations/from-template");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { prompt: "retarget for executives", gammaId: "g_template1" });
  assertEquals(out.generationId, "gen2");
});

Deno.test("create-generation-from-template: folderId wraps into folderIds", async () => {
  const { ctx, calls } = mockCtx([{ body: { generationId: "gen2" } }]);
  await createGenerationFromTemplate.execute(
    { prompt: "p", gammaId: "g1", folderId: "f_1" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.folderIds, ["f_1"]);
  assert(!("folderId" in body));
});
