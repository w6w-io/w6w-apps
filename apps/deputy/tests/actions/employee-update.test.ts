import { assertEquals } from "@std/assert";
import action from "../../actions/employee-update.ts";
import { BASE_URL, mockCtx } from "../_helpers.ts";

Deno.test("employee-update: POSTs only the fields provided to /resource/Employee/{id}", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { Id: 9, Position: "Senior Engineer" } }],
    { display: { baseUrl: BASE_URL } },
  );
  const out = await action.execute({ id: 9, position: "Senior Engineer" }, ctx);
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/resource/Employee/9`);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { Position: "Senior Engineer" });
  assertEquals(out, { Id: 9, Position: "Senior Engineer" });
});

Deno.test("employee-update: an untouched field is never sent — no accidental blanking", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Id: 9 } }], {
    display: { baseUrl: BASE_URL },
  });
  await action.execute({ id: 9, active: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { Active: false });
});

Deno.test("employee-update: is idempotent — replaying the same body lands the same state", () => {
  assertEquals(action.idempotent, true);
});
