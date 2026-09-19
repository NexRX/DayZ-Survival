/** [x, y, z] */
export type Vec3 = readonly [number, number, number];

export type BoolNum = 0 | 1;

export const TRUE = 1;
export const FALSE = 0;

export interface CollectionEntry {
  Amount: number;
  ClassName: string;
  QuantityPercent: number;
  MinQuantityPercent: number;
}
