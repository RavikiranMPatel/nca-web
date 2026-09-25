/**
 * Merchandise Service — stock, restocks and issue history.
 *
 * Stock on hand is always computed server-side (purchases minus non-voided
 * issues); nothing here caches or stores a stock level.
 */

import api from "./axios";

// ==================== TYPES ====================

export type ItemType = "CAP" | "TSHIRT";

export const ONE_SIZE = "ONE_SIZE";

export interface MerchandiseItem {
  id: string;
  publicId: string;
  itemType: ItemType;
  size: string;
  /** Backend's SIZE_ORDER position — sort by this, not size (a string sort
   * gives L, M, S, XL, XS, XXL). */
  sizeRank: number;
  label?: string | null;
  active: boolean;
}

export interface MerchandiseStock {
  id: string;
  publicId: string;
  itemType: ItemType;
  size: string;
  sizeRank: number;
  label?: string | null;
  purchased: number;
  issued: number;
  onHand: number;
}

export interface MerchandisePurchase {
  publicId: string;
  itemPublicId: string;
  itemType: ItemType;
  size: string;
  sizeRank: number;
  label?: string | null;
  quantity: number;
  purchaseDate: string;
  unitCost?: string | null;
  totalCost?: string | null;
  supplier?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}

export interface MerchandiseIssue {
  publicId: string;
  itemPublicId: string;
  itemType: ItemType;
  size: string;
  sizeRank: number;
  label?: string | null;

  recipientType: "PLAYER" | "OTHER";
  recipientName: string;
  playerPublicId?: string | null;
  playerPhotoUrl?: string | null;
  playerGender?: string | null;
  playerActive?: boolean | null;
  playerExternal?: boolean | null;

  quantity: number;
  issuedDate: string;
  notes?: string | null;

  voided: boolean;
  voidedAt?: string | null;
  voidedBy?: string | null;
  voidReason?: string | null;

  createdBy?: string | null;
}

export interface MerchandiseRecipient {
  publicId: string;
  displayName: string;
  photoUrl?: string | null;
  gender?: string | null;
  active: boolean;
  external: boolean;
}

export interface NewPurchase {
  itemPublicId: string;
  quantity: number;
  purchaseDate: string;
  unitCost?: string;
  totalCost?: string;
  supplier?: string;
  notes?: string;
}

export interface NewIssue {
  /** Exactly one of playerPublicId / recipientName. */
  playerPublicId?: string;
  recipientName?: string;
  itemPublicId: string;
  quantity: number;
  issuedDate: string;
  notes?: string;
}

// ==================== HELPERS ====================

/** Caps are stored as ONE_SIZE; show that as blank. */
export const displaySize = (size: string): string =>
  size === ONE_SIZE ? "" : size;

export const itemLabel = (
  item: Pick<MerchandiseItem, "itemType" | "size" | "label">,
): string => {
  if (item.label) return item.label;
  const base = item.itemType === "CAP" ? "Cap" : "T-Shirt";
  const size = displaySize(item.size);
  return size ? `${base} ${size}` : base;
};

// ==================== SERVICE ====================

export const merchandiseService = {
  /**
   * The size vocabulary itself, in display order — not branch-scoped, same list
   * everywhere. Read this rather than keeping a local copy: a hardcoded
   * TSHIRT_SIZES here is exactly the second copy that drifted for age groups
   * before AgeGroupController gave the frontend a single source to read.
   */
  getSizes: async (): Promise<string[]> =>
    (await api.get("/admin/merchandise/sizes")).data,

  getItems: async (): Promise<MerchandiseItem[]> =>
    (await api.get("/admin/merchandise/items")).data,

  createItem: async (
    itemType: ItemType,
    size: string,
    label?: string,
  ): Promise<MerchandiseItem> =>
    (await api.post("/admin/merchandise/items", { itemType, size, label })).data,

  getStock: async (): Promise<MerchandiseStock[]> =>
    (await api.get("/admin/merchandise/stock")).data,

  getPurchases: async (): Promise<MerchandisePurchase[]> =>
    (await api.get("/admin/merchandise/purchases")).data,

  recordPurchase: async (body: NewPurchase): Promise<MerchandisePurchase> =>
    (await api.post("/admin/merchandise/purchases", body)).data,

  getIssues: async (): Promise<MerchandiseIssue[]> =>
    (await api.get("/admin/merchandise/issues")).data,

  issue: async (body: NewIssue): Promise<MerchandiseIssue> =>
    (await api.post("/admin/merchandise/issues", body)).data,

  voidIssue: async (
    issuePublicId: string,
    voidReason: string,
  ): Promise<MerchandiseIssue> =>
    (
      await api.post(`/admin/merchandise/issues/${issuePublicId}/void`, {
        voidReason,
      })
    ).data,

  /** Active, inactive AND external players. */
  getRecipients: async (): Promise<MerchandiseRecipient[]> =>
    (await api.get("/admin/merchandise/recipients")).data,

  getPlayerIssues: async (
    playerPublicId: string,
  ): Promise<MerchandiseIssue[]> =>
    (await api.get(`/admin/merchandise/players/${playerPublicId}/issues`)).data,
};
