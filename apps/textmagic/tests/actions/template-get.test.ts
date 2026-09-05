import { assertEquals } from "@std/assert";
import templateGet from "../../actions/template-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-get: GETs /templates/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 519, name: "Appointment reminder" } }]);
  const out = await templateGet.execute({ id: 519 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/templates/519");
  assertEquals(out, { id: 519, name: "Appointment reminder" });
});
