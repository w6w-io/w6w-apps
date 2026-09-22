import { assertEquals } from "@std/assert";
import action from "../../actions/employee-search.ts";
import { BASE_URL, mockCtx } from "../_helpers.ts";

Deno.test("employee-search: POSTs the QUERY body with search/sort/join/start/max", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: [{ Id: 1 }] }],
    { display: { baseUrl: BASE_URL } },
  );
  const out = await action.execute({
    search: '{"s1":{"field":"Active","data":true,"type":"eq"}}',
    sort: '{"Id":"asc"}',
    join: "CompanyObject",
    max: 50,
    cursor: 100,
  }, ctx) as { items: unknown[]; count: number; start: number; nextCursor?: number };
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/resource/Employee/QUERY`);
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    search: { s1: { field: "Active", data: true, type: "eq" } },
    sort: { Id: "asc" },
    join: ["CompanyObject"],
    start: 100,
    max: 50,
  });
  assertEquals(out.items, [{ Id: 1 }]);
  assertEquals(out.count, 1);
  assertEquals(out.start, 100);
});

Deno.test("employee-search: offers nextCursor only when the page came back full", async () => {
  const full = Array.from({ length: 5 }, (_, i) => ({ Id: i }));
  const { ctx } = mockCtx([{ status: 200, body: full }], { display: { baseUrl: BASE_URL } });
  const out = await action.execute({ max: 5 }, ctx) as { nextCursor?: number };
  assertEquals(out.nextCursor, 5);
});
