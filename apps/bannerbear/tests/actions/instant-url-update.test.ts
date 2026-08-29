import { assertEquals } from "@std/assert";
import instantUrlUpdate from "../../actions/instant-url-update.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("instant-url-update: PATCH /instant_urls/{uid}, resends name and template", async () => {
  const { ctx, calls } = mockCtx([{ body: { uid: "iu1", status: "disabled" } }]);
  await instantUrlUpdate.execute(
    { uid: "iu1", name: "Card URL", template: "t1", status: "disabled" },
    ctx,
  );

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/instant_urls/iu1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Card URL");
  assertEquals(body.status, "disabled");
});

Deno.test("instant-url-update: requires uid, name and template", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => instantUrlUpdate.execute({ uid: "", name: "n", template: "t" }, ctx));
  await assertRejects(() => instantUrlUpdate.execute({ uid: "u", name: "", template: "t" }, ctx));
  await assertRejects(() => instantUrlUpdate.execute({ uid: "u", name: "n", template: "" }, ctx));
});
