/** [x, y, z] */
export type Vec3 = readonly [number, number, number];

export type BoolNum = 0 | 1;

export const TRUE = 1 as const;
export const FALSE = 0 as const;

export interface CollectionEntry {
  Amount: number;
  ClassName: string;
  /** -1 for any Quantity percentage, 1-100 otherwise */
  QuantityPercent: number;
  MinQuantityPercent: number;
}
