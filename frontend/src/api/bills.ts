import request from "@/utils/request";

export interface BillItem {
  _id: string;
  elderlyId: any;
  accountId: string;
  month: string;
  startBalance: number;
  startGiftBalance: number;
  endBalance: number;
  endGiftBalance: number;
  totalRecharge: number;
  totalGift: number;
  totalConsume: number;
  totalSubsidyDeduction: number;
  totalRefund: number;
  consumeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BillQueryParams {
  page?: number;
  pageSize?: number;
  elderlyId?: string;
  month?: string;
}

export interface BillListResponse {
  total: number;
  list: BillItem[];
  page: number;
  pageSize: number;
}

export function getBillList(params: BillQueryParams) {
  return request.get<any, BillListResponse>("/bills", { params });
}

export function getBillDetail(id: string) {
  return request.get<any, BillItem>(`/bills/${id}`);
}

export function getElderlyBills(elderlyId: string) {
  return request.get<any, BillItem[]>(`/bills/elderly/${elderlyId}`);
}

export function generateBills(month: string) {
  return request.post<any, { message: string; count: number }>(
    "/bills/generate",
    { month },
  );
}

export function getBillConsumeDetails(id: string) {
  return request.get<any, any[]>(`/bills/${id}/consume-details`);
}
