import { assertEquals, assertRejects } from "@std/assert";
import transactionalStatisticsGet from "../../actions/transactional-statistics-get.ts";
import { API_PATH, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const STATS = {
  Query: { Group: "Password Reset", From: "2014-02-03", To: "2015-02-02" },
  Sent: 1000,
  Bounces: 8,
  Delivered: 992,
  Opened: 300,
  Clicked: 50,
};

Deno.test("transactional-statistics-get: GETs /transactional/statistics with no extension", async () => {
  const { ctx, calls } = mockCtx([{ body: STATS }]);
  const out = await transactionalStatisticsGet.execute(
    { group: "Password Reset", from: "2014-02-03", to: "2015-02-02", timezone: "utc" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), `${API_PATH}/transactional/statistics`);
  assertEquals(queryOf(calls[0].url), {
    group: "Password Reset",
    from: "2014-02-03",
    to: "2015-02-02",
    timezone: "utc",
  });
  assertEquals(out, STATS);
});

/** Sent and Delivered are different numbers and both must survive. */
Deno.test("transactional-statistics-get: keeps Sent and Delivered apart", async () => {
  const { ctx } = mockCtx([{ body: STATS }]);
  const out = await transactionalStatisticsGet.execute({}, ctx);
  assertEquals(out.Sent, 1000);
  assertEquals(out.Delivered, 992);
  assertEquals(out.Sent - out.Delivered, out.Bounces);
});

Deno.test("transactional-statistics-get: refuses group + smart email, which is code 924", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await transactionalStatisticsGet.execute({ group: "g", smartEmailId: "s" }, ctx),
    Error,
    "924",
  );
  assertEquals(calls.length, 0);
});

Deno.test("transactional-statistics-get: uses the vendor's camelCase query names", async () => {
  const { ctx, calls } = mockCtx([{ body: STATS }]);
  await transactionalStatisticsGet.execute({ clientId: "cid", smartEmailId: "sid" }, ctx);
  assertEquals(queryOf(calls[0].url), { clientID: "cid", smartEmailID: "sid" });
});
