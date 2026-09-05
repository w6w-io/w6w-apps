import { assertEquals } from "@std/assert";
import templateCreate from "../../actions/template-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-create: POSTs to /templates", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: 519, href: "/api/v2/templates/519" },
  }]);
  const out = await templateCreate.execute(
    { name: "Appointment reminder", content: "Hello {First name}!" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/v2/templates");
  assertEquals(
    JSON.parse(calls[0].body!),
    { name: "Appointment reminder", content: "Hello {First name}!" },
  );
  assertEquals(out, { id: 519, href: "/api/v2/templates/519" });
});
