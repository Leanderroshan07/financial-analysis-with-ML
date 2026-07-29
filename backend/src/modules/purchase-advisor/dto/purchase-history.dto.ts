export interface PurchaseHistoryDto {
  id: string;
  userId: string;
  purchaseName?: string;
  purchasePrice: number;
  recommendation: string;
  pattern: string;
  confidenceRec: number;
  confidencePat: number;
  createdAt: Date;
}
