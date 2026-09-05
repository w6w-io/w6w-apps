import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/companies-update.ts";

Deno.test("companies-update: POSTs companies.update with id and returns {id} on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ id: "c1", name: "Pied Piper Inc" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/companies.update");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.id, "c1");
  assertEquals(body.name, "Pied Piper Inc");
  assertEquals(out, { id: "c1" });
});
