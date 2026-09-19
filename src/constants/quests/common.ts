/** @deprecated Usage of this variable needs updating */
export const PLACEHOLDER_POSITION = [0, 0, 0] as const;
/** @deprecated Usage of this variable needs updating */
export const PLACEHOLDER_ORIENTATION = [0, 0, 0] as const;

export const QUEST_CONFIG_VERSION = 22;
export const OBJECTIVE_CONFIG_VERSION = 28;
export const NPC_CONFIG_VERSION = 6;
export const CURRENCY_CLASSNAME = "expansionbanknotehryvnia";
export const CURRENCY_MULTIPLIER = 1000;

export function reward(className: string, amount: number = 1) {
  return { ClassName: className, Amount: amount };
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
