export type TransactionType = 'PURCHASE' | 'CONSUMPTION' | 'REFUND' | 'ADMIN_ADJUSTMENT' | 'BONUS';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'ROLLED_BACK';
export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface CreditAccount {
  id: string;
  userId: string;
  balance: number;
}

export interface CreditTransaction {
  id: string;
  accountId: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
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

export interface AdjustCreditsRequest {
  userId: string;
  amount: number;
  description: string;
}
