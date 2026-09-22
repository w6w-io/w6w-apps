import { assertEquals } from "@std/assert";
import action from "../../actions/employee-list.ts";
import { BASE_URL, mockCtx } from "../_helpers.ts";

Deno.test("employee-list: GETs /resource/Employee and reports count", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: [{ Id: 1 }, { Id: 2 }, { Id: 3 }] }],
    { display: { baseUrl: BASE_URL } },
  );
  const out = await action.execute({}, ctx);
  assertEquals(out, { items: [{ Id: 1 }, { Id: 2 }, { Id: 3 }], count: 3 });
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/resource/Employee`);
});

Deno.test("employee-list: an empty install reports count 0, not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [] }], { display: { baseUrl: BASE_URL } });
  const out = await action.execute({}, ctx);
  assertEquals(out, { items: [], count: 0 });
});
