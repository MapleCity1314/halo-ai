import { describe, it, expect } from "vitest";
import { MessageLog } from "../src/log.js";

describe("MessageLog", () => {
  it("starts empty", () => {
    const log = new MessageLog();
    expect(log.length).toBe(0);
    expect(log.toFullHistory()).toEqual([]);
  });

  it("append bumps version", () => {
    const log = new MessageLog();
    const v0 = log.version;
    log.append({ role: "user", content: "hi" });
    expect(log.version).toBeGreaterThan(v0);
  });

  it("toFullHistory returns a copy", () => {
    const log = new MessageLog();
    log.append({ role: "user", content: "hi" });
    const hist = log.toFullHistory();
    hist[0]!.content = "modified";
    expect(log.toFullHistory()[0]!.content).toBe("hi");
  });

  it("recent returns last N", () => {
    const log = new MessageLog();
    log.append({ role: "user", content: "1" });
    log.append({ role: "user", content: "2" });
    log.append({ role: "user", content: "3" });
    expect(log.recent(2).map((m) => m.content)).toEqual(["2", "3"]);
  });
});
