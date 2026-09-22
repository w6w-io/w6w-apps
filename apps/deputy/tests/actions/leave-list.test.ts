import { assertEquals } from "@std/assert";
import action from "../../actions/leave-list.ts";
import { BASE_URL, mockCtx } from "../_helpers.ts";

Deno.test("leave-list: GETs /resource/Leave and reports count", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: [{ Id: 1, Status: 1 }] }],
    { display: { baseUrl: BASE_URL } },
  );
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/resource/Leave`);
  assertEquals(out, { items: [{ Id: 1, Status: 1 }], count: 1 });
});

Deno.test("leave-list: read-only — no leave write action exists in this app", () => {
  assertEquals(action.type, "read");
});
