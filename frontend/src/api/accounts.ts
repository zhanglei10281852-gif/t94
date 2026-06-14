import request from '@/utils/request'

export type AccountStatus = 'normal' | 'frozen' | 'cancelled'

export interface AccountItem {
  _id: string
  elderlyId: any
  balance: number
  giftBalance: number
  totalRecharge: number
  totalGift: number
  totalConsume: number
  totalSubsidyDeduction: number
  totalRefund: number
  status: AccountStatus
  lastConsumeAt?: string
  createdAt: string
  updatedAt: string
}

export interface AccountQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  status?: AccountStatus
  canteenId?: string
  lowBalance?: boolean
}

export interface AccountListResponse {
  total: number
  list: AccountItem[]
  page: number
  pageSize: number
}

export interface ReconciliationResult {
  accountId: string
  currentBalance: number
  currentGiftBalance: number
  totalBalance: number
  totalRecharge: number
  totalGift: number
  totalConsume: number
  totalRefund: number
  expectedBalance: number
  isBalanced: boolean
  difference: number
}

export interface AccountStatsSummary {
  totalAccounts: number
  activeAccounts: number
  frozenAccounts: number
  lowBalanceAccounts: number
  inactiveAccounts: number
  totalBalance: number
  totalGiftBalance: number
  totalAllBalance: number
  totalRecharge: number
  totalConsume: number
}

export function getAccountList(params: AccountQueryParams) {
  return request.get<any, AccountListResponse>('/accounts', { params })
}

export function getAccountDetail(id: string) {
  return request.get<any, AccountItem>(`/accounts/${id}`)
}

export function getAccountByElderlyId(elderlyId: string) {
  return request.get<any, AccountItem>(`/accounts/elderly/${elderlyId}`)
}

export function createAccount(elderlyId: string) {
  return request.post<any, AccountItem>('/accounts', { elderlyId })
}

export function updateAccountStatus(id: string, status: AccountStatus) {
  return request.patch<any, AccountItem>(`/accounts/${id}/status`, { status })
}

export function reconcileAccount(id: string) {
  return request.get<any, ReconciliationResult>(`/accounts/${id}/reconcile`)
}

export function getAccountStatsSummary() {
  return request.get<any, AccountStatsSummary>('/accounts/stats/summary')
}
