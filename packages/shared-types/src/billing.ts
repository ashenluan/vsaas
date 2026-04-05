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

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
}

export interface Order {
  id: string;
  userId: string;
  packageId: string | null;
  amount: number;
  credits: number;
  currency: string;
  status: OrderStatus;
  paymentMethod: string | null;
  createdAt: string;
  paidAt: string | null;
}
