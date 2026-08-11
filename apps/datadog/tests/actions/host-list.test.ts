import { assert, assertEquals } from "@std/assert";
import hostList from "../../actions/host-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("host-list: calls GET /api/v1/hosts with Datadog's parameter names", async () => {
  const { ctx, calls } = mockCtx([{
    body: { host_list: [{ name: "web-01" }], total_matching: 1, total_returned: 1 },
  }]);
  const out = await hostList.execute(
    { filter: "env:prod", count: 100, from: 1_700_000_000, sortField: "name", sortDir: "asc" },
    ctx,
  ) as { host_list: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v1/hosts");
  assertEquals(queryOf(calls[0].url), {
    filter: "env:prod",
    count: "100",
    from: "1700000000",
    sort_field: "name",
    sort_dir: "asc",
  });
  assertEquals(out.host_list.length, 1);
});

Deno.test("host-list: the two include flags are sent only when true", async () => {
  const on = mockCtx([{ body: {} }]);
  await hostList.execute({ includeMutedHostsData: true, includeHostsMetadata: true }, on.ctx);
  assertEquals(queryOf(on.calls[0].url), {
    include_muted_hosts_data: "true",
    include_hosts_metadata: "true",
  });

  const off = mockCtx([{ body: {} }]);
  await hostList.execute({ includeMutedHostsData: false }, off.ctx);
  assertEquals(queryOf(off.calls[0].url), {});
});

/**
 * Two documented behaviours that produce a surprising empty or partial result:
 * the default window is three hours, and EC2 hosts carry `aws_id` where
 * everything else carries `id`.
 */
Deno.test("host-list: the window and the EC2 id substitution are both stated", () => {
  const hint = hostList.params?.find((p) => p.key === "from")?.hint ?? "";
  assert(hint.includes("3 hours"), hint);
  const field = (hostList.output as Array<{ key: string; label: string }>)
    .find((f) => f.key === "host_list");
  assert(field?.label.includes("aws_id"), field?.label);
});
