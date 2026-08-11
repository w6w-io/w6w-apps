import { assertEquals } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const USER = {
  name: "John Doe",
  email: "john@example.com",
  lifetime_pro_at: "2022-01-01T00:00:00Z",
  vanity_path: "johndoe",
  language: "en",
  profile_picture_url: "https://www.gravatar.com/avatar/abc",
  currency_symbol: "$",
};

/** `GET /me` answers the bare `User`, not `{"data": …}`. */
Deno.test("account-get: calls GET /api/me and returns the bare entity", async () => {
  const { ctx, calls } = mockCtx([{ body: USER }]);
  const out = await accountGet.execute({}, ctx) as typeof USER;

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/me");
  assertEquals(out.vanity_path, "johndoe");
});

/**
 * The declared output is the whole documented schema and nothing invented — this
 * is the endpoint the health probe reads, so what it is expected to contain is
 * worth pinning.
 */
Deno.test("account-get: declares exactly TidyCal's seven User fields", () => {
  const keys = (accountGet.output as Array<{ key: string }>).map((o) => o.key).sort();
  assertEquals(keys, Object.keys(USER).sort());
});
