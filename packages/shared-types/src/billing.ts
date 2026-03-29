export enum TransactionType {
  PURCHASE = 'PURCHASE',
  USAGE = 'USAGE',
  REFUND = 'REFUND',
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
  BONUS = 'BONUS',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export interface CreditBalance {
  balance: number;
  userId: string;
}

export interface CreditTransactionRecord {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  description: string;
  referenceId: string | null;
  balanceAfter: number;
  createdAt: string;
}
