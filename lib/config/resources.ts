/**
 * Single source of truth for resource categories and cooldown rules.
 * Add or adjust entries here when scaling to new kit types.
 */
export type ResourceCategoryId =
  | "Hygiene"
  | "Laundry"
  | "Cleaning"
  | "Special";

export type ResourceDefinition = {
  id: ResourceCategoryId;
  label: string;
  lastDateField:
    | "LastHygieneDate"
    | "LastLaundryDate"
    | "LastCleaningDate"
    | "LastSpecialDate";
  cooldownDays: number;
};

export const RESOURCE_DEFINITIONS: readonly ResourceDefinition[] = [
  {
    id: "Hygiene",
    label: "Hygiene Kit",
    lastDateField: "LastHygieneDate",
    cooldownDays: 7,
  },
  {
    id: "Laundry",
    label: "Laundry Kit / Voucher",
    lastDateField: "LastLaundryDate",
    cooldownDays: 14,
  },
  {
    id: "Cleaning",
    label: "Cleaning Kit",
    lastDateField: "LastCleaningDate",
    cooldownDays: 30,
  },
  {
    id: "Special",
    label: "Special Items",
    lastDateField: "LastSpecialDate",
    cooldownDays: 60,
  },
] as const;

export function getResourceById(
  id: ResourceCategoryId,
): ResourceDefinition | undefined {
  return RESOURCE_DEFINITIONS.find((r) => r.id === id);
}
