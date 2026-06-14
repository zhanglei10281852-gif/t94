<template>
  <div class="page">
    <a-row :gutter="16" class="stat-row">
      <a-col :span="5">
        <a-card class="stat-card">
          <div class="stat-icon" style="background: #e6f7ff">
            <UserOutlined style="color: #1890ff; font-size: 24px" />
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ stats.totalAccounts }}</div>
            <div class="stat-label">总账户数</div>
          </div>
        </a-card>
      </a-col>
      <a-col :span="5">
        <a-card class="stat-card">
          <div class="stat-icon" style="background: #f6ffed">
            <CheckCircleOutlined style="color: #52c41a; font-size: 24px" />
          </div>
          <div class="stat-info">
            <div class="stat-number" style="color: #52c41a">{{ stats.activeAccounts }}</div>
            <div class="stat-label">活跃账户</div>
          </div>
        </a-card>
      </a-col>
      <a-col :span="5">
        <a-card class="stat-card">
          <div class="stat-icon" style="background: #fff7e6">
            <PauseCircleOutlined style="color: #fa8c16; font-size: 24px" />
          </div>
          <div class="stat-info">
            <div class="stat-number" style="color: #fa8c16">{{ stats.frozenAccounts }}</div>
            <div class="stat-label">冻结账户</div>
          </div>
        </a-card>
      </a-col>
      <a-col :span="5">
        <a-card class="stat-card">
          <div class="stat-icon" style="background: #fff1f0">
            <ExclamationCircleOutlined style="color: #ff4d4f; font-size: 24px" />
          </div>
          <div class="stat-info">
            <div class="stat-number" style="color: #ff4d4f">{{ stats.lowBalanceAccounts }}</div>
            <div class="stat-label">余额不足账户</div>
          </div>
        </a-card>
      </a-col>
      <a-col :span="4">
        <a-card class="stat-card">
          <div class="stat-icon" style="background: #f9f0ff">
            <DollarOutlined style="color: #722ed1; font-size: 24px" />
          </div>
          <div class="stat-info">
            <div class="stat-number" style="color: #722ed1">¥{{ stats.totalBalance?.toFixed(2) }}</div>
            <div class="stat-label">总余额</div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <div class="page-header">
      <a-form :model="queryForm" layout="inline">
        <a-form-item label="关键词">
          <a-input
            v-model:value="queryForm.keyword"
            placeholder="姓名/电话/身份证"
            style="width: 200px"
            allow-clear
            @pressEnter="handleSearch"
          />
        </a-form-item>
        <a-form-item label="状态">
          <a-select
            v-model:value="queryForm.status"
            placeholder="全部状态"
            style="width: 120px"
            allow-clear
          >
            <a-select-option value="normal">正常</a-select-option>
            <a-select-option value="frozen">冻结</a-select-option>
            <a-select-option value="cancelled">注销</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="助餐点">
          <a-select
            v-model:value="queryForm.canteenId"
            placeholder="全部助餐点"
            style="width: 150px"
            allow-clear
          >
            <a-select-option v-for="c in canteenList" :key="c._id" :value="c._id">
              {{ c.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="余额不足">
          <a-switch v-model:checked="queryForm.lowBalance" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="handleSearch">
            <SearchOutlined />
            搜索
          </a-button>
          <a-button style="margin-left: 8px" @click="handleReset">
            重置
          </a-button>
        </a-form-item>
        <a-form-item style="float: right">
          <a-button type="primary" @click="handleExport">
            <ExportOutlined />
            导出
          </a-button>
        </a-form-item>
      </a-form>
    </div>

    <a-table
      :columns="columns"
      :data-source="dataSource"
      :pagination="pagination"
      :loading="loading"
      row-key="_id"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'elderInfo'">
          <div class="elder-name">{{ record.elderId?.name || '-' }}</div>
          <div class="elder-sub">{{ record.elderId?.phone || '-' }}</div>
        </template>
        <template v-else-if="column.key === 'age'">
          {{ record.elderId?.age || '-' }}
        </template>
        <template v-else-if="column.key === 'community'">
          {{ record.elderId?.community || '-' }}
        </template>
        <template v-else-if="column.key === 'balance'">
          <span :class="{ 'low-balance': record.balance < lowBalanceThreshold }">
            ¥{{ record.balance?.toFixed(2) }}
          </span>
        </template>
        <template v-else-if="column.key === 'giftBalance'">
          ¥{{ record.giftBalance?.toFixed(2) }}
        </template>
        <template v-else-if="column.key === 'totalRecharge'">
          ¥{{ record.totalRecharge?.toFixed(2) }}
        </template>
        <template v-else-if="column.key === 'totalConsume'">
          ¥{{ record.totalConsume?.toFixed(2) }}
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="getStatusTagColor(record.status)">
            {{ getStatusText(record.status) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'lastConsumeTime'">
          {{ record.lastConsumeTime ? dayjs(record.lastConsumeTime).format('YYYY-MM-DD HH:mm') : '-' }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button type="link" size="small" @click="handleRecharge(record)">
            充值
          </a-button>
          <a-button type="link" size="small" @click="handleDetail(record)">
            详情
          </a-button>
          <a-popconfirm
            v-if="record.status === 'normal'"
            title="确定冻结该账户？"
            @confirm="handleFreeze(record)"
          >
            <a-button type="link" size="small" danger>
              冻结
            </a-button>
          </a-popconfirm>
          <a-popconfirm
            v-else-if="record.status === 'frozen'"
            title="确定解冻该账户？"
            @confirm="handleUnfreeze(record)"
          >
            <a-button type="link" size="small" style="color: #52c41a">
              解冻
            </a-button>
          </a-popconfirm>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="rechargeModalVisible"
      title="账户充值"
      width="480px"
      @ok="handleRechargeSubmit"
      @cancel="rechargeModalVisible = false"
      :confirmLoading="rechargeLoading"
    >
      <a-form ref="rechargeFormRef" :model="rechargeForm" layout="vertical">
        <a-form-item label="老人姓名">
          <span>{{ currentAccount?.elderId?.name }}</span>
        </a-form-item>
        <a-form-item label="当前余额">
          <span>¥{{ currentAccount?.balance?.toFixed(2) }}</span>
        </a-form-item>
        <a-form-item
          label="充值金额"
          name="amount"
          :rules="[{ required: true, message: '请输入充值金额' }]"
        >
          <a-input-number
            v-model:value="rechargeForm.amount"
            :min="0.01"
            :precision="2"
            style="width: 100%"
            placeholder="请输入充值金额"
          />
        </a-form-item>
        <a-form-item
          label="赠送金额"
          name="giftAmount"
        >
          <a-input-number
            v-model:value="rechargeForm.giftAmount"
            :min="0"
            :precision="2"
            style="width: 100%"
            placeholder="请输入赠送金额"
          />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea
            v-model:value="rechargeForm.remark"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  SearchOutlined,
  UserOutlined,
  CheckCircleOutlined,
  PauseCircleOutlined,
  ExclamationCircleOutlined,
  DollarOutlined,
  ExportOutlined,
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import {
  getAccountList,
  getAccountStats,
  freezeAccount,
  unfreezeAccount,
  AccountItem,
  AccountQueryParams,
  AccountStats,
} from '@/api/accounts'
import { createRecharge } from '@/api/recharges'
import { getCanteenList, CanteenItem } from '@/api/canteens'

const lowBalanceThreshold = 10

const loading = ref(false)
const dataSource = ref<AccountItem[]>([])
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条记录`,
})

const stats = ref<AccountStats>({
  totalAccounts: 0,
  activeAccounts: 0,
  frozenAccounts: 0,
  lowBalanceAccounts: 0,
  totalBalance: 0,
})

const queryForm = reactive({
  keyword: '',
  status: undefined as string | undefined,
  canteenId: undefined as string | undefined,
  lowBalance: false,
})

const canteenList = ref<CanteenItem[]>([])

const rechargeModalVisible = ref(false)
const rechargeLoading = ref(false)
const rechargeFormRef = ref()
const currentAccount = ref<AccountItem | null>(null)

const rechargeForm = reactive({
  amount: undefined as number | undefined,
  giftAmount: undefined as number | undefined,
  remark: '',
})

const columns = [
  { title: '老人信息', key: 'elderInfo', width: 160 },
  { title: '年龄', key: 'age', width: 80 },
  { title: '社区', key: 'community', width: 120 },
  { title: '账户余额', key: 'balance', width: 120 },
  { title: '赠送余额', key: 'giftBalance', width: 120 },
  { title: '累计充值', key: 'totalRecharge', width: 120 },
  { title: '累计消费', key: 'totalConsume', width: 120 },
  { title: '账户状态', key: 'status', width: 100 },
  { title: '最后消费时间', key: 'lastConsumeTime', width: 160 },
  { title: '操作', key: 'action', width: 200, fixed: 'right' },
]

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    normal: '正常',
    frozen: '冻结',
    cancelled: '注销',
  }
  return map[status] || status
}

function getStatusTagColor(status: string): string {
  const map: Record<string, string> = {
    normal: 'green',
    frozen: 'orange',
    cancelled: 'red',
  }
  return map[status] || 'default'
}

async function loadStats() {
  try {
    const data = await getAccountStats()
    stats.value = data
  } catch (e) {
    console.error(e)
  }
}

async function loadData() {
  loading.value = true
  try {
    const params: AccountQueryParams = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: queryForm.keyword,
      status: queryForm.status,
      canteenId: queryForm.canteenId,
      lowBalance: queryForm.lowBalance || undefined,
    }
    const res = await getAccountList(params)
    dataSource.value = res.list
    pagination.total = res.total
  } finally {
    loading.value = false
  }
}

async function loadCanteens() {
  try {
    const res = await getCanteenList()
    canteenList.value = res
  } catch (e) {
    console.error(e)
  }
}

function handleSearch() {
  pagination.current = 1
  loadData()
}

function handleReset() {
  queryForm.keyword = ''
  queryForm.status = undefined
  queryForm.canteenId = undefined
  queryForm.lowBalance = false
  pagination.current = 1
  loadData()
}

function handleTableChange(pag: any) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadData()
}

function handleDetail(record: AccountItem) {
  console.log('查看详情:', record)
}

function handleRecharge(record: AccountItem) {
  currentAccount.value = record
  rechargeForm.amount = undefined
  rechargeForm.giftAmount = undefined
  rechargeForm.remark = ''
  rechargeModalVisible.value = true
}

async function handleRechargeSubmit() {
  if (!currentAccount.value) return
  rechargeLoading.value = true
  try {
    await rechargeFormRef.value?.validate()
    await createRecharge({
      accountId: currentAccount.value._id,
      amount: rechargeForm.amount,
      giftAmount: rechargeForm.giftAmount,
      remark: rechargeForm.remark,
    })
    message.success('充值成功')
    rechargeModalVisible.value = false
    loadData()
    loadStats()
  } finally {
    rechargeLoading.value = false
  }
}

async function handleFreeze(record: AccountItem) {
  try {
    await freezeAccount(record._id)
    message.success('冻结成功')
    loadData()
    loadStats()
  } catch (e) {
    console.error(e)
  }
}

async function handleUnfreeze(record: AccountItem) {
  try {
    await unfreezeAccount(record._id)
    message.success('解冻成功')
    loadData()
    loadStats()
  } catch (e) {
    console.error(e)
  }
}

function handleExport() {
  message.info('导出功能开发中')
}

onMounted(() => {
  loadStats()
  loadData()
  loadCanteens()
})
</script>

<style scoped>
.page {
  padding: 24px;
}

.stat-row {
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: 600;
  color: #1890ff;
  line-height: 1.2;
}

.stat-label {
  color: #666;
  font-size: 13px;
  margin-top: 4px;
}

.page-header {
  margin-bottom: 16px;
}

.elder-name {
  font-weight: 500;
  color: #262626;
}

.elder-sub {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 2px;
}

.low-balance {
  color: #ff4d4f;
  font-weight: 500;
}
</style>
