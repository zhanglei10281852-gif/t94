import request from "@/utils/request";

export interface AccountStatsOverview {
  totalAccounts: number;
  activeAccounts: number;
  frozenAccounts: number;
  lowBalanceAccounts: number;
  totalBalance: number;
  totalGiftBalance: number;
  monthRechargeAmount: number;
  monthConsumeAmount: number;
  lowBalanceThreshold: number;
}

export interface MonthlyTrendItem {
  month: string;
  rechargeTotal: number;
  consumeTotal: number;
}

export interface CanteenDistributionItem {
  canteenId: string;
  canteenName: string;
  orderCount: number;
  totalAmount: number;
  totalSubsidy: number;
}

export interface BalanceDistributionItem {
  range: string;
  count: number;
}

export interface RechargeMethodStatItem {
  method: string;
  methodLabel: string;
  count: number;
  totalAmount: number;
  totalGift: number;
}

export function getAccountStatsOverview() {
  return request.get<any, AccountStatsOverview>("/account-stats/overview");
}

export function getMonthlyTrend() {
  return request.get<any, MonthlyTrendItem[]>("/account-stats/monthly-trend");
}

export function getCanteenDistribution(params?: {
  startDate?: string;
  endDate?: string;
}) {
  return request.get<any, CanteenDistributionItem[]>(
    "/account-stats/canteen-distribution",
    { params },
  );
}

export function getBalanceDistribution() {
  return request.get<any, BalanceDistributionItem[]>(
    "/account-stats/balance-distribution",
  );
}

export function getRechargeMethodStats(params?: {
  startDate?: string;
  endDate?: string;
}) {
  return request.get<any, RechargeMethodStatItem[]>(
    "/account-stats/recharge-method-stats",
    { params },
  );
}
