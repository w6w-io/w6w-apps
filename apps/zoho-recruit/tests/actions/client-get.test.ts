import { assertEquals } from "@std/assert";
import { mockRecruitCtx } from "../_helpers.ts";
import action from "../../actions/client-get.ts";

Deno.test("client-get: GETs /Clients/{id} and unwraps the single record", async () => {
  const { ctx, calls } = mockRecruitCtx([{
    body: { data: [{ id: "1", Client_Name: "Avon Group" }] },
  }]);
  const out = await action.execute({ recordId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/recruit/v2/Clients/1");
  assertEquals(out, { id: "1", Client_Name: "Avon Group" });
});
