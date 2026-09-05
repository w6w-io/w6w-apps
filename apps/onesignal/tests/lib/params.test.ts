import { assertEquals, assertThrows } from "@std/assert";
import { buildTargeting } from "../../lib/params.ts";

Deno.test("buildTargeting: comma-list segments become arrays", () => {
  const body = buildTargeting({ includedSegments: "A, B", excludedSegments: "C" });
  assertEquals(body.included_segments, ["A", "B"]);
  assertEquals(body.excluded_segments, ["C"]);
});

Deno.test("buildTargeting: blank fields are omitted, not sent as empty arrays", () => {
  const body = buildTargeting({});
  assertEquals(body.included_segments, undefined);
  assertEquals(body.include_subscription_ids, undefined);
  assertEquals(body.filters, undefined);
  assertEquals(body.include_aliases, undefined);
  assertEquals(body.target_channel, undefined);
});

Deno.test("buildTargeting: parses filters/include_aliases JSON strings", () => {
  const body = buildTargeting({
    filters: '[{"field":"tag","key":"level","relation":"=","value":"10"}]',
    includeAliases: '{"external_id": ["user_1"]}',
    targetChannel: "push",
  });
  assertEquals(body.filters, [{ field: "tag", key: "level", relation: "=", value: "10" }]);
  assertEquals(body.include_aliases, { external_id: ["user_1"] });
  assertEquals(body.target_channel, "push");
});

Deno.test("buildTargeting: malformed filters JSON throws a clear error", () => {
  assertThrows(() => buildTargeting({ filters: "{not json" }), Error, "not valid JSON");
});
