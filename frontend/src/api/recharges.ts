import request from "@/utils/request";

export type RechargeMethod =
  | "cash"
  | "wechat"
  | "alipay"
  | "bank_transfer"
  | "family";
export type RechargeStatus = "success" | "cancelled";

export interface RechargeItem {
  _id: string;
  rechargeNo: string;
  accountId: any;
  elderlyId: any;
  elderlyName?: string;
  rechargeAmount: number;
  giftAmount: number;
  totalAmount: number;
  method: RechargeMethod;
  rechargePerson: string;
  isFamilyRecharge: boolean;
  familyName?: string;
  promotionId?: string;
  status: RechargeStatus;
  remark?: string;
  createdAt: string;
}

export interface RechargeQueryParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: RechargeStatus;
  method?: RechargeMethod;
  startDate?: string;
  endDate?: string;
  accountId?: string;
  elderlyId?: string;
}

export interface RechargeListResponse {
  total: number;
  list: RechargeItem[];
  page: number;
  pageSize: number;
}

export interface RechargePromotion {
  _id: string;
  name: string;
  rechargeAmount: number;
  giftAmount: number;
  status: "active" | "inactive";
  sortOrder: number;
  description?: string;
  createdAt: string;
}

export interface CreateRechargeData {
  elderlyId: string;
  rechargeAmount: number;
  method: RechargeMethod;
  rechargePerson: string;
  isFamilyRecharge?: boolean;
  familyName?: string;
  remark?: string;
}

export interface CalculateGiftResult {
  giftAmount: number;
  applicablePromotion?: {
    id: string;
    name: string;
  };
}

export function getRechargeList(params: RechargeQueryParams) {
  return request.get<any, RechargeListResponse>("/recharges", { params });
}

export function getRechargeDetail(id: string) {
  return request.get<any, RechargeItem>(`/recharges/${id}`);
}

export function createRecharge(data: CreateRechargeData) {
  return request.post<any, RechargeItem>("/recharges", data);
}

export function cancelRecharge(id: string) {
  return request.patch<any, RechargeItem>(`/recharges/${id}/cancel`);
}

export function getRechargePromotions() {
  return request.get<any, RechargePromotion[]>("/recharges/promotions");
}

export function calculateGift(amount: number) {
  return request.get<any, CalculateGiftResult>("/recharges/calculate-gift", {
    params: { amount },
  });
}
