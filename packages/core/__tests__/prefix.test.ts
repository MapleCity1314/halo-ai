import { describe, it, expect } from "vitest";
import { StablePrefix } from "../src/prefix.js";

describe("StablePrefix", () => {
  it("produces consistent fingerprints", () => {
    const a = new StablePrefix({ system: "hello", tools: [] });
    const b = new StablePrefix({ system: "hello", tools: [] });
    expect(a.fingerprint).toBe(b.fingerprint);
  });

  it("changes fingerprint when system changes", () => {
    const a = new StablePrefix({ system: "hello", tools: [] });
    const b = new StablePrefix({ system: "world", tools: [] });
    expect(a.fingerprint).not.toBe(b.fingerprint);
  });

  it("changes fingerprint when tool is added", () => {
    const p = new StablePrefix({ system: "hello", tools: [] });
    const before = p.fingerprint;
    p.addTool({
      type: "function",
      function: { name: "test", description: "", parameters: {} },
    });
    expect(p.fingerprint).not.toBe(before);
  });

  it("toMessages returns system + fewShots", () => {
    const p = new StablePrefix({
      system: "sys",
      tools: [],
      fewShots: [
        { role: "user", content: "q" },
        { role: "assistant", content: "a" },
      ],
    });
    const msgs = p.toMessages();
    expect(msgs).toHaveLength(3);
    expect(msgs[0]!.role).toBe("system");
    expect(msgs[1]!.role).toBe("user");
    expect(msgs[2]!.role).toBe("assistant");
  });

  it("addFewShot changes fingerprint", () => {
    const p = new StablePrefix({ system: "sys", tools: [] });
    const before = p.fingerprint;
    p.addFewShot({ role: "user", content: "example" });
    expect(p.fingerprint).not.toBe(before);
  });
});
