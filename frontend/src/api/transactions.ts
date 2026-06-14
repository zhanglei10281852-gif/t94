import request from "@/utils/request";

export type TransactionType =
  | "recharge"
  | "gift"
  | "consume"
  | "refund"
  | "subsidy_deduction";

export interface TransactionItem {
  _id: string;
  accountId: string;
  elderlyId: any;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  giftBalanceBefore: number;
  giftBalanceAfter: number;
  relatedOrderId?: string;
  relatedRechargeId?: string;
  remark?: string;
  operatorId?: any;
  createdAt: string;
}

export interface TransactionQueryParams {
  page?: number;
  pageSize?: number;
  accountId?: string;
  elderlyId?: string;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
}

export interface TransactionListResponse {
  total: number;
  list: TransactionItem[];
  page: number;
  pageSize: number;
}

export const TransactionTypeLabel: Record<TransactionType, string> = {
  recharge: "充值",
  gift: "赠送",
  consume: "消费",
  refund: "退费",
  subsidy_deduction: "补贴抵扣",
};

export const TransactionTypeColor: Record<TransactionType, string> = {
  recharge: "green",
  gift: "purple",
  consume: "blue",
  refund: "orange",
  subsidy_deduction: "cyan",
};

export function getTransactionList(params: TransactionQueryParams) {
  return request.get<any, TransactionListResponse>("/transactions", { params });
}

export function getTransactionDetail(id: string) {
  return request.get<any, TransactionItem>(`/transactions/${id}`);
}

export function exportTransactionsCsv(params: TransactionQueryParams) {
  return request.get<any, string>("/transactions/export/csv", {
    params,
    responseType: "blob" as any,
  });
}
