import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CartItem } from '@kidswear/core';

export interface CartState {
  items: CartItem[];
}

const initialState: CartState = {
  items: [],
};

/** A cart line is uniquely identified by product + size + color. */
function sameLine(a: CartItem, b: Pick<CartItem, 'productId' | 'size' | 'color'>): boolean {
  return a.productId === b.productId && a.size === b.size && a.color === b.color;
}

export interface UpdateQtyPayload {
  productId: string;
  size: string;
  color: string;
  quantity: number;
}

export type RemoveItemPayload = Pick<CartItem, 'productId' | 'size' | 'color'>;

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      const incoming = action.payload;
      const existing = state.items.find((item) => sameLine(item, incoming));
      if (existing) {
        existing.quantity += incoming.quantity;
      } else {
        state.items.push(incoming);
      }
    },
    removeItem(state, action: PayloadAction<RemoveItemPayload>) {
      state.items = state.items.filter((item) => !sameLine(item, action.payload));
    },
    updateQty(state, action: PayloadAction<UpdateQtyPayload>) {
      const { quantity } = action.payload;
      const target = state.items.find((item) => sameLine(item, action.payload));
      if (!target) return;
      if (quantity <= 0) {
        state.items = state.items.filter((item) => !sameLine(item, action.payload));
      } else {
        target.quantity = quantity;
      }
    },
    clearCart(state) {
      state.items = [];
    },
  },
});

export const { addItem, removeItem, updateQty, clearCart } = cartSlice.actions;
export const cartReducer = cartSlice.reducer;
