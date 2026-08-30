import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/form-get-many.ts";

Deno.test("form-get-many: GETs /forms and returns the array under items", async () => {
  const { ctx, calls } = mockCtx([
    { body: [{ Id: "1", Name: "My Form" }, { Id: "2", Name: "My Form 2" }] },
  ]);
  const result = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/forms");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { items: [{ Id: "1", Name: "My Form" }, { Id: "2", Name: "My Form 2" }] });
});

Deno.test("form-get-many: defaults to an empty array when the vendor sends nothing", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const result = await action.execute({}, ctx);
  assertEquals(result, { items: [] });
});
