import { assertEquals } from "@std/assert";
import dashboardGet from "../../actions/dashboard-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("dashboard-get: calls GET /api/v1/dashboard/{id} and returns the full definition", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "abc-def-ghi", title: "Ops", layout_type: "ordered", widgets: [{ id: 1 }] },
  }]);
  const out = await dashboardGet.execute({ dashboardId: "abc-def-ghi" }, ctx) as {
    title: string;
    widgets: unknown[];
  };

  assertEquals(pathOf(calls[0].url), "/api/v1/dashboard/abc-def-ghi");
  assertEquals(out.title, "Ops");
  assertEquals(out.widgets.length, 1);
});

/** The id is the hyphenated string from the URL, and it is escaped either way. */
Deno.test("dashboard-get: a pasted URL fragment cannot change the request path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await dashboardGet.execute({ dashboardId: "abc-def-ghi/widgets" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/dashboard/abc-def-ghi%2Fwidgets");
});
