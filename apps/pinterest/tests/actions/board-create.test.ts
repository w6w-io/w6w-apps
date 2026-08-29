import { assertEquals } from "@std/assert";
import boardCreate from "../../actions/board-create.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("board-create: POSTs /boards with name/description/privacy", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { id: "1", name: "Summer recipes", privacy: "PUBLIC", pin_count: 0 } },
  ]);
  const out = await boardCreate.execute(
    { name: "Summer recipes", description: "Yum", privacy: "PUBLIC" },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v5/boards");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Summer recipes",
    description: "Yum",
    privacy: "PUBLIC",
  });
  assertEquals(out.id, "1");
});

Deno.test("board-create: forwards ad_account_id as a query parameter", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "1", name: "x" } }]);
  await boardCreate.execute({ name: "x", adAccountId: "999" }, ctx);
  assertEquals(queryOf(calls[0].url).ad_account_id, "999");
});
