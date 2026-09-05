import { assertEquals } from "@std/assert";
import clipProjectUpdateVisibility from "../../actions/clip-project-update-visibility.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("clip-project-update-visibility: POSTs the visibility body to the right path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "P1", visibility: "PUBLIC" } }]);
  const out = await clipProjectUpdateVisibility.execute(
    { projectId: "P1", visibility: "PUBLIC" },
    ctx,
  ) as { visibility: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/clip-projects/P1/update-visibility");
  assertEquals(JSON.parse(calls[0].body!), { visibility: "PUBLIC" });
  assertEquals(out.visibility, "PUBLIC");
});

Deno.test("clip-project-update-visibility: is declared idempotent", () => {
  assertEquals(clipProjectUpdateVisibility.idempotent, true);
});
