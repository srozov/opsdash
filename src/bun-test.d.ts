// The subset of Bun's built-in test runner API used by *.test.ts files. Bun
// ships the real types in @types/bun; declaring the subset here avoids adding a
// dependency only for typechecking (plan D5).
declare module "bun:test" {
  interface Matchers {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toHaveLength(length: number): void;
    toThrow(message?: string | RegExp): void;
  }
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void): void;
  export function expect(actual: unknown): Matchers;
}
