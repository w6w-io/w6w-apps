import { assertEquals } from "@std/assert";
import { DEFAULT_DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/project-list.ts";

Deno.test("project-list: unwraps a single project (not an array)", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 200,
      body: {
        pagination: { pageNumber: "1", pageSize: "100", totalAvailable: "1" },
        projects: { project: { id: "p1", name: "Default" } },
      },
    }],
    { display: DEFAULT_DISPLAY },
  );
  const result = await action.execute!({}, ctx) as { projects: unknown[] };
  assertEquals(result.projects, [{ id: "p1", name: "Default" }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/3.21/sites/site-1/projects");
});

Deno.test("project-list: returnAll walks pages until a short one", async () => {
  const full = Array.from({ length: 100 }, (_, i) => ({ id: `p${i}` }));
  const { ctx, calls } = mockCtx(
    [
      {
        status: 200,
        body: {
          pagination: { pageNumber: "1", pageSize: "100", totalAvailable: "101" },
          projects: { project: full },
        },
      },
      {
        status: 200,
        body: {
          pagination: { pageNumber: "2", pageSize: "100", totalAvailable: "101" },
          projects: { project: { id: "p100" } },
        },
      },
    ],
    { display: DEFAULT_DISPLAY },
  );
  const result = await action.execute!({ returnAll: true }, ctx) as { projects: unknown[] };
  assertEquals(result.projects.length, 101);
  assertEquals(new URL(calls[1].url).searchParams.get("pageNumber"), "2");
});

Deno.test("project-list: filter and sort reach the wire", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { projects: {} } }],
    { display: DEFAULT_DISPLAY },
  );
  await action.execute!({ filter: "name:eq:Sales", sort: "name:asc" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("filter"), "name:eq:Sales");
  assertEquals(q.get("sort"), "name:asc");
  assertEquals(action.type, "read");
});
