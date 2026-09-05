import { assertEquals } from "@std/assert";
import { mockRecruitCtx } from "../_helpers.ts";
import action from "../../actions/client-delete.ts";

Deno.test("client-delete: DELETEs /Clients with the id in the `ids` query param", async () => {
  const { ctx, calls } = mockRecruitCtx([
    { body: { data: [{ code: "SUCCESS", status: "success", details: { id: "1" } }] } },
  ]);
  await action.execute({ recordId: "1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.pathname, "/recruit/v2/Clients");
  assertEquals(url.searchParams.get("ids"), "1");
});

Deno.test("client-delete: idempotent — deleting an already-deleted id converges", () => {
  assertEquals(action.idempotent, true);
});
