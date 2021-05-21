/**
 * An instance of `Schemable` for `fast-check` arbitraries that emit valid values
 */
import * as fc from 'fast-check'
import { ReadonlyNonEmptyArray } from 'fp-ts/lib/ReadonlyNonEmptyArray'
import * as D from '../src/poc'
import { Schemable1, WithUnion1 } from '../src/Schemable2'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

export interface Arbitrary<A> extends fc.Arbitrary<A> {}

// -------------------------------------------------------------------------------------
// primitives
// -------------------------------------------------------------------------------------

export const string: Arbitrary<string> = fc.oneof(
  fc.string(),
  fc.asciiString(),
  fc.fullUnicodeString(),
  fc.hexaString(),
  fc.lorem()
)

export const number: Arbitrary<number> = fc.oneof(fc.float(), fc.double(), fc.integer())

export const boolean: Arbitrary<boolean> = fc.boolean()

export const UnknownArray: Arbitrary<Array<unknown>> = fc.array(fc.anything())

export const UnknownRecord: Arbitrary<Record<string, unknown>> = fc.dictionary(string, fc.anything())

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

export const literal = <A extends ReadonlyNonEmptyArray<D.Literal>>(...values: A): Arbitrary<A[number]> =>
  fc.oneof(...values.map((v) => fc.constant(v)))

// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------

export const nullable = <A>(or: Arbitrary<A>): Arbitrary<null | A> => fc.oneof(fc.constant(null), or)

export const tuple = <A extends ReadonlyArray<unknown>>(
  ...components: { [K in keyof A]: Arbitrary<A[K]> }
): Arbitrary<A> => (components.length === 0 ? fc.constant([]) : (fc.tuple as any)(...components))

export const struct = <A>(properties: { [K in keyof A]: Arbitrary<A[K]> }): Arbitrary<A> => fc.record(properties)

export const partial = <A>(properties: { [K in keyof A]: Arbitrary<A[K]> }): Arbitrary<Partial<A>> => {
  const keys = fc.oneof(...Object.keys(properties).map((p) => fc.constant(p)))
  return keys.chain((key) => {
    const p: any = { ...properties }
    delete p[key]
    return fc.record(p)
  })
}

export const array = <A>(item: Arbitrary<A>): Arbitrary<Array<A>> => fc.array(item)

export const record = <A>(codomain: Arbitrary<A>): Arbitrary<Record<string, A>> => fc.dictionary(string, codomain)

export const union = <A extends ReadonlyArray<unknown>>(
  ...members: { [K in keyof A]: Arbitrary<A[K]> }
): Arbitrary<A[number]> => fc.oneof(...members)

export const intersect = <B extends D.Intersecable>(right: Arbitrary<B>) => <A extends D.Intersecable>(
  left: Arbitrary<A>
): Arbitrary<A & B> => fc.tuple(left, right).map(([a, b]) => D.intersect_(a, b))

export const lazy = <A>(f: () => Arbitrary<A>): Arbitrary<A> => {
  const get = D.memoize<void, Arbitrary<A>>(f)
  return fc.constant(null).chain(() => get())
}

export function sum<T extends string>(
  _tag: T
): <A>(members: { [K in keyof A]: Arbitrary<A[K] & Record<T, K>> }) => Arbitrary<A[keyof A]> {
  return (members: Record<string, Arbitrary<any>>) => fc.oneof(...Object.keys(members).map((k) => members[k]))
}

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

export const URI = 'io-ts/toArbitrary'

export type URI = typeof URI

declare module 'fp-ts/lib/HKT' {
  interface URItoKind<A> {
    readonly [URI]: Arbitrary<D.TypeOf<A>>
  }
}

export const toArbitrary: Schemable1<URI> & WithUnion1<URI> = {
  URI: URI,
  literal,
  string,
  number,
  boolean,
  UnknownArray,
  UnknownRecord,
  tuple: tuple as any,
  struct: struct as any,
  partial: partial as any,
  array,
  record,
  nullable,
  intersect,
  lazy: (_, f) => lazy(f),
  sum: sum as any,
  union
}
