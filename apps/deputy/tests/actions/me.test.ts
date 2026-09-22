import { assertEquals } from "@std/assert";
import action from "../../actions/me.ts";
import { BASE_URL, mockCtx } from "../_helpers.ts";

Deno.test("me: GETs /api/v1/me and returns the body under response", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { DisplayName: "Carlos Sainz" } }],
    { display: { baseUrl: BASE_URL } },
  );
  const out = await action.execute({}, ctx);
  assertEquals(out, { response: { DisplayName: "Carlos Sainz" } });
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/me`);
  assertEquals(calls[0].method, "GET");
});

Deno.test("me: manifest shape — read, no params", () => {
  assertEquals(action.type, "read");
  assertEquals(action.params?.length ?? 0, 0);
});
