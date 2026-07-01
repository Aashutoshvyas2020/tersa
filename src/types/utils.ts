/**
 * Recursive immutable view that preserves callable and collection APIs.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export type DeepImmutable<T> = T extends (...args: any[]) => any
  ? T
  : T extends Date
    ? T
    : T extends Promise<infer U>
      ? Promise<DeepImmutable<U>>
      : T extends Map<infer K, infer V>
        ? ReadonlyMap<DeepImmutable<K>, DeepImmutable<V>>
        : T extends ReadonlyMap<infer K, infer V>
          ? ReadonlyMap<DeepImmutable<K>, DeepImmutable<V>>
          : T extends Set<infer U>
            ? ReadonlySet<DeepImmutable<U>>
            : T extends ReadonlySet<infer U>
              ? ReadonlySet<DeepImmutable<U>>
              : T extends readonly (infer U)[]
                ? readonly DeepImmutable<U>[]
                : T extends object
                  ? { readonly [K in keyof T]: DeepImmutable<T[K]> }
                  : T

export type Permutations<
  T extends string,
  U extends string = T,
> = T extends T ? T | `${T}${Permutations<Exclude<U, T>>}` : never
