import type { ResourceCategoryId } from "@/lib/config/resources";

export type ClientRecord = {
  ClientID: string;
  FirstName: string;
  FamilySize: number;
  LastHygieneDate?: string | null;
  LastLaundryDate?: string | null;
  LastCleaningDate?: string | null;
  LastSpecialDate?: string | null;
};

export type CreateClientInput = {
  firstName: string;
  familySize: number;
};

export type TransactionCategory = ResourceCategoryId;
