import { createHash } from "node:crypto";
import type { ChatMessage, ToolSpec } from "./types.js";

export interface StablePrefixOptions {
  system: string;
  tools: ToolSpec[];
  fewShots?: ChatMessage[];
  hashFn?: (input: string) => string;
}

export class StablePrefix {
  private _system: string;
  private _toolSpecs: ToolSpec[];
  private readonly _fewShots: ChatMessage[];
  private readonly _hashFn: (input: string) => string;
  private _fingerprintCache: string | null = null;

  constructor(opts: StablePrefixOptions) {
    this._system = opts.system;
    this._toolSpecs = [...opts.tools];
    this._fewShots = [...(opts.fewShots ?? [])];
    this._hashFn = opts.hashFn ?? defaultHash;
  }

  /** Messages that form the stable prefix: [system, ...fewShots]. */
  toMessages(): ChatMessage[] {
    return [{ role: "system", content: this._system }, ...this._fewShots.map((m) => ({ ...m }))];
  }

  /** Frozen shallow copy of the tool list. */
  tools(): ToolSpec[] {
    return Object.freeze(
      this._toolSpecs.map((t) => Object.freeze({ ...t, function: { ...t.function } })),
    ) as unknown as ToolSpec[];
  }

  /** SHA-256[:16] fingerprint of the entire prefix. */
  get fingerprint(): string {
    if (this._fingerprintCache !== null) return this._fingerprintCache;
    this._fingerprintCache = this.computeFingerprint();
    return this._fingerprintCache;
  }

  get diagnostics() {
    return {
      systemHash: this._hashFn(JSON.stringify(this._system)),
      toolSpecsHash: this._hashFn(JSON.stringify(this._toolSpecs)),
      fewShotsHash: this._hashFn(JSON.stringify(this._fewShots)),
      toolCount: this._toolSpecs.length,
      toolNames: this._toolSpecs.map((t) => t.function.name).filter(Boolean),
    };
  }

  // ── Mutation ──

  addTool(spec: ToolSpec): boolean {
    const name = spec.function?.name;
    if (!name) return false;
    if (this._toolSpecs.some((t) => t.function?.name === name)) return false;
    this._toolSpecs.push(spec);
    this.invalidate();
    return true;
  }

  removeTool(name: string): boolean {
    const idx = this._toolSpecs.findIndex((t) => t.function?.name === name);
    if (idx < 0) return false;
    this._toolSpecs.splice(idx, 1);
    this.invalidate();
    return true;
  }

  addFewShot(msg: ChatMessage): void {
    this._fewShots.push(msg);
    this.invalidate();
  }

  removeFewShot(index: number): boolean {
    if (index < 0 || index >= this._fewShots.length) return false;
    this._fewShots.splice(index, 1);
    this.invalidate();
    return true;
  }

  // ── Private ──

  private invalidate(): void {
    this._fingerprintCache = null;
  }

  private computeFingerprint(): string {
    const blob = JSON.stringify({
      system: this._system,
      tools: this._toolSpecs,
      shots: this._fewShots,
    });
    return this._hashFn(blob);
  }
}

function defaultHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}
