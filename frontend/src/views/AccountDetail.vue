<template>
  <div class="page">
    <div class="page-header">
      <a-button @click="handleBack" style="margin-right: 12px">
        <ArrowLeftOutlined />
        返回
      </a-button>
      <h2 style="display: inline-block; margin: 0">账户详情</h2>
    </div>

    <div v-if="loading" style="text-align: center; padding: 40px">
      <a-spin size="large" />
    </div>

    <template v-else>
      <a-row :gutter="24">
        <a-col :span="16">
          <a-card class="balance-card">
            <div class="balance-header">
              <div class="balance-info">
                <div class="balance-label">总余额</div>
                <div class="balance-amount">¥ {{ account?.balance?.toFixed(2) || '0.00' }}</div>
              </div>
              <div class="balance-status">
                <a-tag :color="getStatusColor(account?.status)">
                  {{ getStatusText(account?.status) }}
                </a-tag>
              </div>
            </div>
            <div class="balance-detail">
              <div class="balance-item">
                <div class="item-label">本金余额</div>
                <div class="item-value">¥ {{ (account?.balance || 0) - (account?.giftBalance || 0) > 0 ? ((account?.balance || 0) - (account?.giftBalance || 0)).toFixed(2) : '0.00' }}</div>
              </div>
              <div class="balance-divider"></div>
              <div class="balance-item">
                <div class="item-label">赠送余额</div>
                <div class="item-value gift">¥ {{ account?.giftBalance?.toFixed(2) || '0.00' }}</div>
              </div>
            </div>
          </a-card>

          <a-card title="累计数据" class="stats-card">
            <a-row :gutter="16">
              <a-col :span="8">
                <div class="stat-item">
                  <div class="stat-icon recharge">
                    <DollarOutlined />
                  </div>
                  <div class="stat-info">
                    <div class="stat-value">¥ {{ account?.totalRecharge?.toFixed(2) || '0.00' }}</div>
                    <div class="stat-label">累计充值</div>
                  </div>
                </div>
              </a-col>
              <a-col :span="8">
                <div class="stat-item">
                  <div class="stat-icon gift">
                    <GiftOutlined />
                  </div>
                  <div class="stat-info">
                    <div class="stat-value">¥ {{ account?.totalGift?.toFixed(2) || '0.00' }}</div>
                    <div class="stat-label">累计赠送</div>
                  </div>
                </div>
              </a-col>
              <a-col :span="8">
                <div class="stat-item">
                  <div class="stat-icon consume">
                    <ShopOutlined />
                  </div>
                  <div class="stat-info">
                    <div class="stat-value">¥ {{ account?.totalConsume?.toFixed(2) || '0.00' }}</div>
                    <div class="stat-label">累计消费</div>
                  </div>
                </div>
              </a-col>
            </a-row>
            <a-row :gutter="16" style="margin-top: 16px">
              <a-col :span="8">
                <div class="stat-item">
                  <div class="stat-icon subsidy">
                    <MedalOutlined />
                  </div>
                  <div class="stat-info">
                    <div class="stat-value">¥ {{ account?.totalSubsidyDeduction?.toFixed(2) || '0.00' }}</div>
                    <div class="stat-label">累计补贴抵扣</div>
                  </div>
                </div>
              </a-col>
              <a-col :span="8">
                <div class="stat-item">
                  <div class="stat-icon refund">
                    <RollbackOutlined />
                  </div>
                  <div class="stat-info">
                    <div class="stat-value">¥ {{ account?.totalRefund?.toFixed(2) || '0.00' }}</div>
                    <div class="stat-label">累计退费</div>
                  </div>
                </div>
              </a-col>
            </a-row>
          </a-card>

          <a-card title="账户信息" class="info-card">
            <a-descriptions :column="2" size="default">
              <a-descriptions-item label="账户状态">
                <a-tag :color="getStatusColor(account?.status)">
                  {{ getStatusText(account?.status) }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="开户时间">
                {{ formatDate(account?.createdAt) }}
              </a-descriptions-item>
              <a-descriptions-item label="老人姓名">
                {{ elderlyInfo?.name || '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="联系电话">
                {{ elderlyInfo?.phone || '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="所属社区">
                {{ elderlyInfo?.community || '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="补贴类别">
                {{ getSubsidyText(elderlyInfo?.subsidyCategory) }}
              </a-descriptions-item>
              <a-descriptions-item label="最后消费时间">
                {{ formatDateTime(account?.lastConsumeAt) }}
              </a-descriptions-item>
            </a-descriptions>
          </a-card>

          <a-card title="交易流水" class="timeline-card">
            <template #extra>
              <a-select
                v-model:value="transactionTypeFilter"
                style="width: 140px"
                size="small"
                @change="handleTransactionTypeChange"
              >
                <a-select-option value="">全部类型</a-select-option>
                <a-select-option value="recharge">充值</a-select-option>
                <a-select-option value="gift">赠送</a-select-option>
                <a-select-option value="consume">消费</a-select-option>
                <a-select-option value="refund">退款</a-select-option>
                <a-select-option value="subsidy_deduction">补贴抵扣</a-select-option>
              </a-select>
            </template>

            <a-timeline v-if="transactions.length > 0">
              <a-timeline-item
                v-for="item in transactions"
                :key="item._id"
                :color="getTimelineColor(item.type)"
              >
                <div class="timeline-item">
                  <div class="timeline-header">
                    <span class="timeline-title">{{ getTransactionTypeText(item.type) }}</span>
                    <span class="timeline-date">{{ formatDateTime(item.createdAt) }}</span>
                  </div>
                  <div class="timeline-content">
                    <span class="timeline-amount" :class="getDirectionClass(item.type)">
                      {{ getAmountPrefix(item.type) }}¥{{ item.amount.toFixed(2) }}
                    </span>
                  </div>
                  <div v-if="item.remark" class="timeline-desc">{{ item.remark }}</div>
                  <div class="timeline-balance">
                    余额：¥{{ item.balanceAfter?.toFixed(2) || '0.00' }}
                  </div>
                </div>
              </a-timeline-item>
            </a-timeline>
            <a-empty v-else description="暂无交易记录" />

            <div v-if="hasMoreTransactions" class="load-more">
              <a-button :loading="loadingMore" @click="loadMoreTransactions">
                加载更多
              </a-button>
            </div>
          </a-card>
        </a-col>

        <a-col :span="8">
          <a-card title="操作" class="action-card">
            <a-space direction="vertical" style="width: 100%">
              <a-button type="primary" block size="large" @click="handleRecharge">
                <WalletOutlined />
                充值
              </a-button>
              <a-button
                block
                size="large"
                :type="account?.status === 'frozen' ? 'primary' : 'default'"
                :danger="account?.status !== 'frozen'"
                @click="handleToggleFreeze"
                :loading="freezeLoading"
              >
                <LockOutlined v-if="account?.status !== 'frozen'" />
                <UnlockOutlined v-else />
                {{ account?.status === 'frozen' ? '解冻账户' : '冻结账户' }}
              </a-button>
              <a-button block size="large" @click="handleReconcile">
                <FileTextOutlined />
                对账
              </a-button>
            </a-space>
          </a-card>

          <a-card title="月度账单" class="bills-card">
            <div class="month-selector">
              <a-select
                v-model:value="selectedYear"
                style="width: 100%"
                @change="handleYearChange"
              >
                <a-select-option v-for="y in availableYears" :key="y" :value="y">
                  {{ y }}年
                </a-select-option>
              </a-select>
            </div>

            <div v-if="bills.length > 0" class="bills-list">
              <div
                v-for="bill in bills"
                :key="bill._id"
                class="bill-item"
                :class="{ active: selectedBillId === bill._id }"
                @click="handleSelectBill(bill)"
              >
                <div class="bill-month">{{ formatMonth(bill.month) }}</div>
                <div class="bill-amount">
                  <span class="label">期末余额：</span>
                  <span class="value">¥{{ bill.endBalance?.toFixed(2) || '0.00' }}</span>
                </div>
                <div class="bill-stats">
                  <span>充值：¥{{ bill.totalRecharge?.toFixed(2) || '0.00' }}</span>
                  <span>消费：¥{{ bill.totalConsume?.toFixed(2) || '0.00' }}</span>
                </div>
              </div>
            </div>
            <a-empty v-else description="暂无账单数据" />
          </a-card>

          <a-card v-if="selectedBill" title="账单详情" class="bill-detail-card">
            <a-descriptions :column="1" size="small">
              <a-descriptions-item label="账单月份">
                {{ formatMonth(selectedBill.month) }}
              </a-descriptions-item>
              <a-descriptions-item label="期初余额">
                ¥{{ selectedBill.startBalance?.toFixed(2) || '0.00' }}
              </a-descriptions-item>
              <a-descriptions-item label="期末余额">
                ¥{{ selectedBill.endBalance?.toFixed(2) || '0.00' }}
              </a-descriptions-item>
              <a-descriptions-item label="期初赠送余额">
                ¥{{ selectedBill.startGiftBalance?.toFixed(2) || '0.00' }}
              </a-descriptions-item>
              <a-descriptions-item label="期末赠送余额">
                ¥{{ selectedBill.endGiftBalance?.toFixed(2) || '0.00' }}
              </a-descriptions-item>
              <a-descriptions-item label="本月充值">
                ¥{{ selectedBill.totalRecharge?.toFixed(2) || '0.00' }}
              </a-descriptions-item>
              <a-descriptions-item label="本月赠送">
                ¥{{ selectedBill.totalGift?.toFixed(2) || '0.00' }}
              </a-descriptions-item>
              <a-descriptions-item label="本月消费">
                ¥{{ selectedBill.totalConsume?.toFixed(2) || '0.00' }}
                ({{ selectedBill.consumeCount || 0 }}笔)
              </a-descriptions-item>
              <a-descriptions-item label="本月补贴抵扣">
                ¥{{ selectedBill.totalSubsidyDeduction?.toFixed(2) || '0.00' }}
              </a-descriptions-item>
              <a-descriptions-item label="本月退费">
                ¥{{ selectedBill.totalRefund?.toFixed(2) || '0.00' }}
              </a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-col>
      </a-row>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  ArrowLeftOutlined,
  WalletOutlined,
  LockOutlined,
  UnlockOutlined,
  FileTextOutlined,
  DollarOutlined,
  GiftOutlined,
  ShopOutlined,
  MedalOutlined,
  RollbackOutlined,
} from '@ant-design/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AccountItem,
  getAccountDetail,
  freezeAccount,
  unfreezeAccount,
} from '@/api/accounts'
import { TransactionItem, getTransactionList } from '@/api/transactions'
import { BillItem, getBillList } from '@/api/bills'
import { getElderlyDetail, ElderlyItem } from '@/api/elderly'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const freezeLoading = ref(false)
const loadingMore = ref(false)

const account = ref<AccountItem | null>(null)
const elderlyInfo = ref<ElderlyItem | null>(null)
const transactions = ref<TransactionItem[]>([])
const bills = ref<BillItem[]>([])
const selectedBill = ref<BillItem | null>(null)
const selectedBillId = ref('')

const transactionTypeFilter = ref('')
const transactionPage = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})

const selectedYear = ref(new Date().getFullYear())
const availableYears = computed(() => {
  const years = []
  const currentYear = new Date().getFullYear()
  for (let i = 0; i < 5; i++) {
    years.push(currentYear - i)
  }
  return years
})

const hasMoreTransactions = computed(() => {
  return transactions.value.length < transactionPage.total
})

function getStatusText(status?: string): string {
  const map: Record<string, string> = {
    normal: '正常',
    frozen: '已冻结',
    cancelled: '已注销',
  }
  return map[status || ''] || '未知'
}

function getStatusColor(status?: string): string {
  const map: Record<string, string> = {
    normal: 'green',
    frozen: 'orange',
    cancelled: 'default',
  }
  return map[status || ''] || 'default'
}

function getSubsidyText(category?: string): string {
  const map: Record<string, string> = {
    low_income_full: '低保户全额补贴',
    low_income: '低收入补贴',
    normal: '普通补贴',
  }
  return map[category || ''] || '-'
}

function getTransactionTypeText(type: string): string {
  const map: Record<string, string> = {
    recharge: '充值',
    gift: '赠送',
    consume: '消费',
    refund: '退款',
    subsidy_deduction: '补贴抵扣',
  }
  return map[type] || type
}

function getTimelineColor(type: string): string {
  const map: Record<string, string> = {
    recharge: 'green',
    gift: 'purple',
    consume: 'blue',
    refund: 'orange',
    subsidy_deduction: 'gold',
  }
  return map[type] || 'blue'
}

function getDirectionClass(type: string): string {
  const incomeTypes = ['recharge', 'gift', 'refund']
  return incomeTypes.includes(type) ? 'in' : 'out'
}

function getAmountPrefix(type: string): string {
  const incomeTypes = ['recharge', 'gift', 'refund']
  return incomeTypes.includes(type) ? '+' : '-'
}

function formatDate(date?: string): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

function formatDateTime(date?: string): string {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMonth(month: string): string {
  if (!month) return '-'
  const parts = month.split('-')
  return `${parts[0]}年${parts[1]}月`
}

async function loadAccount() {
  const id = route.params.id as string
  if (!id) return

  loading.value = true
  try {
    account.value = await getAccountDetail(id)

    const elderlyId = account.value.elderlyId?._id || account.value.elderlyId
    if (elderlyId) {
      try {
        elderlyInfo.value = await getElderlyDetail(elderlyId)
      } catch (e) {
        console.error(e)
      }
    }
  } finally {
    loading.value = false
  }
}

async function loadTransactions(reset = false) {
  if (!account.value) return

  if (reset) {
    transactionPage.current = 1
    transactions.value = []
  }

  try {
    const res = await getTransactionList({
      accountId: account.value._id,
      page: transactionPage.current,
      pageSize: transactionPage.pageSize,
      type: transactionTypeFilter.value || undefined,
    })
    if (reset) {
      transactions.value = res.list
    } else {
      transactions.value = [...transactions.value, ...res.list]
    }
    transactionPage.total = res.total
  } catch (e) {
    console.error(e)
  }
}

async function loadMoreTransactions() {
  if (loadingMore.value) return
  loadingMore.value = true
  try {
    transactionPage.current++
    await loadTransactions()
  } finally {
    loadingMore.value = false
  }
}

function handleTransactionTypeChange() {
  loadTransactions(true)
}

async function loadBills() {
  if (!account.value) return

  try {
    const res = await getBillList({
      accountId: account.value._id,
      year: selectedYear.value,
      pageSize: 12,
    })
    bills.value = res.list.sort((a, b) => b.month.localeCompare(a.month))
    if (bills.value.length > 0 && !selectedBill.value) {
      handleSelectBill(bills.value[0])
    }
  } catch (e) {
    console.error(e)
  }
}

function handleYearChange() {
  selectedBill.value = null
  selectedBillId.value = ''
  loadBills()
}

function handleSelectBill(bill: BillItem) {
  selectedBill.value = bill
  selectedBillId.value = bill._id
}

function handleBack() {
  router.back()
}

function handleRecharge() {
  router.push('/recharge')
}

async function handleToggleFreeze() {
  if (!account.value) return

  const isFrozen = account.value.status === 'frozen'
  const action = isFrozen ? '解冻' : '冻结'

  Modal.confirm({
    title: `确认${action}账户`,
    content: `您确定要${action}该老人的账户吗？`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      freezeLoading.value = true
      try {
        if (isFrozen) {
          await unfreezeAccount(account.value!._id)
          message.success('账户已解冻')
        } else {
          await freezeAccount(account.value!._id)
          message.success('账户已冻结')
        }
        loadAccount()
      } finally {
        freezeLoading.value = false
      }
    },
  })
}

function handleReconcile() {
  message.info('对账功能开发中')
}

onMounted(() => {
  loadAccount()
  loadTransactions(true)
  loadBills()
})
</script>

<style scoped>
.page {
  padding: 24px;
}

.page-header {
  margin-bottom: 16px;
}

.balance-card {
  margin-bottom: 16px;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  color: #fff;
  border: none;
}

.balance-card :deep(.ant-card-head-title) {
  color: #fff;
}

.balance-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.balance-label {
  font-size: 14px;
  opacity: 0.8;
  margin-bottom: 8px;
}

.balance-amount {
  font-size: 36px;
  font-weight: bold;
}

.balance-detail {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 16px;
}

.balance-item {
  flex: 1;
  text-align: center;
}

.balance-item .item-label {
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 4px;
}

.balance-item .item-value {
  font-size: 18px;
  font-weight: 500;
}

.balance-item .item-value.gift {
  color: #ffd666;
}

.balance-divider {
  width: 1px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
}

.stats-card,
.info-card,
.timeline-card,
.action-card,
.bills-card,
.bill-detail-card {
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin-right: 12px;
}

.stat-icon.recharge {
  background: #e6f7ff;
  color: #1890ff;
}

.stat-icon.gift {
  background: #fff0f6;
  color: #eb2f96;
}

.stat-icon.consume {
  background: #f6ffed;
  color: #52c41a;
}

.stat-icon.subsidy {
  background: #fffbe6;
  color: #faad14;
}

.stat-icon.refund {
  background: #f9f0ff;
  color: #722ed1;
}

.stat-info .stat-value {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.stat-info .stat-label {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.timeline-item {
  padding: 4px 0;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timeline-title {
  font-weight: 500;
  color: #333;
}

.timeline-date {
  font-size: 12px;
  color: #999;
}

.timeline-content {
  margin-top: 4px;
}

.timeline-amount {
  font-size: 16px;
  font-weight: bold;
}

.timeline-amount.in {
  color: #52c41a;
}

.timeline-amount.out {
  color: #ff4d4f;
}

.timeline-desc {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.timeline-balance {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.load-more {
  text-align: center;
  margin-top: 16px;
}

.month-selector {
  margin-bottom: 12px;
}

.bills-list {
  max-height: 400px;
  overflow-y: auto;
}

.bill-item {
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.bill-item:hover {
  border-color: #1890ff;
}

.bill-item.active {
  border-color: #1890ff;
  background: #e6f7ff;
}

.bill-month {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.bill-amount {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.bill-amount .value {
  color: #1890ff;
  font-weight: 500;
}

.bill-stats {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
}
</style>
