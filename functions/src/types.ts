// Deliberate duplication: functions are kept self-contained outside the monorepo build.
// Do NOT import from @kidswear/core or any other workspace package here.
export type OrderStatus = 'pending' | 'deposit_paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  depositAmount: number;
  paidAmount: number;
  total: number;
  status: OrderStatus;
  cancelReason?: string;
  payment?: {
    provider: 'payme' | 'click' | 'mock';
    state: 'created' | 'paid' | 'cancelled';
    transactionId?: string;
    createdAt?: number;
    paidAt?: number;
    cancelledAt?: number;
    cancelReason?: number;
  };
  shippingAddress: {
    fullName: string;
    phone: string;
    region: string;
    district: string;
    street: string;
  };
}
