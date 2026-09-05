import { assertEquals } from "@std/assert";
import { mockRecruitCtx } from "../_helpers.ts";
import action from "../../actions/candidate-get.ts";

Deno.test("candidate-get: GETs /Candidates/{id} and unwraps the single record", async () => {
  const { ctx, calls } = mockRecruitCtx([{ body: { data: [{ id: "1", Last_Name: "Jacky" }] } }]);
  const out = await action.execute({ recordId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/recruit/v2/Candidates/1");
  assertEquals(out, { id: "1", Last_Name: "Jacky" });
});
