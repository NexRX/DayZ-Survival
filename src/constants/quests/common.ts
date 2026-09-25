import { ClassNameModded } from "../types/classNames.ts";
import type { Item, Quest, RewardEntry } from "../types/quest.d.ts";

/** @deprecated Usage of this variable needs updating */
export const PLACEHOLDER_POSITION = [200, 100, 300] as const;
/** @deprecated Usage of this variable needs updating */
export const PLACEHOLDER_ORIENTATION = [201, 101, 301] as const;

export const QUEST_CONFIG_VERSION = 22;
export const OBJECTIVE_CONFIG_VERSION = 28;
export const NPC_CONFIG_VERSION = 6;
export const CURRENCY_CLASSNAME = "ExpansionBanknoteHryvnia";
export const CURRENCY_MULTIPLIER = 1000;

// Common Locations Only!
export const ROMASHKA_FARM = [7986, 221, 11308] as const;
export const SEVEROGRAD_CENTER = [8061.14, 113.996, 12728.1] as const;

export function item(
  className: ClassNameModded,
  Amount: number = 1,
  DamagePercent: number = 0,
): Item {
  return {
    ClassName: className,
    Amount,
    DamagePercent,
  };
}

export function reward(
  className: ClassNameModded,
  Amount: number = 1,
  DamagePercent: number = 0,
  Chance: number = 1,
): RewardEntry {
  return {
    ClassName: className,
    Amount,
    Chance,
    DamagePercent,
  };
}

export function currency(amount: number) {
  return reward(CURRENCY_CLASSNAME, amount * CURRENCY_MULTIPLIER);
}

export type ColourMap = { r?: number; g?: number; b?: number; a?: number };
export function colourMap(colour: ColourMap): number {
  const red = clamp(colour.r ?? 0);
  const green = clamp(colour.g ?? 0);
  const blue = clamp(colour.b ?? 0);
  const alpha = clamp(colour.a ?? 255);

  return (alpha << 24) | (red << 16) | (green << 8) | blue;
}
export function rgb(r?: number, g?: number, b?: number, a?: number) {
  return colourMap({ r, g, b, a });
}

function clamp(num: number) {
  return num <= 0 ? 0 : num >= 255 ? 255 : num;
}

export function configToRecord<T extends { ID: string | number }>(
  configurations: T[],
  filePrefix: string,
) {
  return configurations.reduce(
    (configs, config) => {
      configs[`${filePrefix}${config.ID}.json`] = config;
      return configs;
    },
    {} as Record<string, T>,
  );
}

export function fixQuests(quests: Quest[]) {
  return quests.map((q) => {
    q.Rewards = (q.Rewards ?? []).map((r) => {
      if (r.QuestID === undefined) r.QuestID = q.ID;
      return r;
    });
    return q;
  });
}

export function safetyChecks<T extends { ID: number }>(
  objs: T[],
  label: string,
  preexisting: T[] = [],
): T[] {
  const ids = new Set<number>();
  const conflicting = new Set<number>();
  preexisting.forEach(({ ID }) => ids.add(ID));

  for (const { ID } of objs) {
    if (ids.has(ID)) {
      conflicting.add(ID);
    } else {
      ids.add(ID);
    }
  }

  if (conflicting.size > 0) {
    throw new Error(
      `Conflicting ${label} IDs: ${Array.from(conflicting).join(", ")}`,
    );
  }
  return objs;
}
