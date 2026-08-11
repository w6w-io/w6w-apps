import { assertEquals } from "@std/assert";
import spaceGet from "../../actions/space-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const SPACE = { space_id: 7, name: "Sales", privacy: "closed", rights: ["view", "add_app"] };

Deno.test("space-get: GETs one space and returns it whole", async () => {
  const { ctx, calls } = mockCtx([{ body: SPACE }]);
  assertEquals(await spaceGet.execute({ spaceId: "7" }, ctx), { space: SPACE });
  assertEquals(pathOf(calls[0].url), "/space/7");
  assertEquals(calls[0].method, "GET");
});

Deno.test("space-get: keeps `rights`, which is what a workflow branches on", async () => {
  const { ctx } = mockCtx([{ body: SPACE }]);
  const out = await spaceGet.execute({ spaceId: "7" }, ctx) as { space: Record<string, unknown> };
  assertEquals(out.space.rights, ["view", "add_app"]);
});

Deno.test("space-get: an empty body yields an empty object", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await spaceGet.execute({ spaceId: "7" }, ctx), { space: {} });
});
