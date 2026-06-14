<template>
  <div class="page">
    <div class="page-header">
      <a-form :model="queryForm" layout="inline">
        <a-form-item label="老人关键词">
          <a-input
            v-model:value="queryForm.keyword"
            placeholder="请输入老人姓名"
            style="width: 180px"
            allow-clear
            @pressEnter="handleSearch"
          />
        </a-form-item>
        <a-form-item label="交易类型">
          <a-select
            v-model:value="queryForm.type"
            placeholder="全部类型"
            style="width: 160px"
            allow-clear
            @change="handleSearch"
          >
            <a-select-option value="recharge">充值</a-select-option>
            <a-select-option value="gift">赠送</a-select-option>
            <a-select-option value="consume">消费</a-select-option>
            <a-select-option value="refund">退费</a-select-option>
            <a-select-option value="subsidy_deduction">补贴抵扣</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="时间范围">
          <a-range-picker
            v-model:value="dateRange"
            style="width: 260px"
            @change="handleDateChange"
          />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="handleSearch">
            <SearchOutlined />
            查询
          </a-button>
        </a-form-item>
        <a-form-item>
          <a-button @click="handleReset">重置</a-button>
        </a-form-item>
        <a-form-item style="float: right">
          <a-button @click="handleExport">
            <DownloadOutlined />
            导出CSV
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
        <template v-if="column.key === 'createdAt'">
          {{ formatDateTime(record.createdAt) }}
        </template>
        <template v-else-if="column.key === 'elderlyName'">
          {{ record.elderlyId?.name || '-' }}
        </template>
        <template v-else-if="column.key === 'type'">
          <a-tag :color="getTypeColor(record.type)">
            {{ getTypeText(record.type) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'amount'">
          <span :style="{ color: getAmountColor(record.type) }">
            {{ getAmountPrefix(record.type) }}¥{{ record.amount.toFixed(2) }}
          </span>
        </template>
        <template v-else-if="column.key === 'balanceChange'">
          <div>
            <span style="color: #999">¥{{ record.balanceBefore.toFixed(2) }}</span>
            <ArrowRightOutlined style="margin: 0 6px; color: #ccc" />
            <span>¥{{ record.balanceAfter.toFixed(2) }}</span>
          </div>
        </template>
        <template v-else-if="column.key === 'giftBalanceChange'">
          <div>
            <span style="color: #999">¥{{ record.giftBalanceBefore.toFixed(2) }}</span>
            <ArrowRightOutlined style="margin: 0 6px; color: #ccc" />
            <span>¥{{ record.giftBalanceAfter.toFixed(2) }}</span>
          </div>
        </template>
        <template v-else-if="column.key === 'relatedDoc'">
          <template v-if="record.relatedOrderId">
            <span style="color: #1890ff">订单: {{ record.relatedOrderId }}</span>
          </template>
          <template v-else-if="record.relatedRechargeId">
            <span style="color: #52c41a">充值: {{ record.relatedRechargeId }}</span>
          </template>
          <template v-else>
            -
          </template>
        </template>
        <template v-else-if="column.key === 'remark'">
          {{ record.remark || '-' }}
        </template>
        <template v-else-if="column.key === 'operator'">
          {{ record.operatorId || '-' }}
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import dayjs, { Dayjs } from 'dayjs'
import {
  SearchOutlined,
  DownloadOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons-vue'
import {
  getTransactionList,
  TransactionItem,
  TransactionType,
} from '@/api/transactions'

const loading = ref(false)
const dataSource = ref<TransactionItem[]>([])
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条记录`,
})

const dateRange = ref<[Dayjs | null, Dayjs | null]>([null, null])

const queryForm = reactive({
  keyword: '',
  type: undefined as TransactionType | undefined,
  startDate: undefined as string | undefined,
  endDate: undefined as string | undefined,
})

const columns = [
  { title: '交易时间', key: 'createdAt', dataIndex: 'createdAt', width: 170 },
  { title: '老人姓名', key: 'elderlyName', width: 120 },
  { title: '交易类型', key: 'type', width: 110 },
  { title: '交易金额', key: 'amount', width: 130 },
  { title: '余额变动', key: 'balanceChange', width: 200 },
  { title: '赠送余额变动', key: 'giftBalanceChange', width: 200 },
  { title: '关联单据', key: 'relatedDoc', width: 200 },
  { title: '备注', key: 'remark', width: 150 },
  { title: '操作人', key: 'operator', width: 120 },
]

function getTypeText(type: TransactionType): string {
  const map: Record<TransactionType, string> = {
    recharge: '充值',
    gift: '赠送',
    consume: '消费',
    refund: '退费',
    subsidy_deduction: '补贴抵扣',
  }
  return map[type] || type
}

function getTypeColor(type: TransactionType): string {
  const map: Record<TransactionType, string> = {
    recharge: 'green',
    gift: 'purple',
    consume: 'blue',
    refund: 'orange',
    subsidy_deduction: 'cyan',
  }
  return map[type] || 'default'
}

function getAmountColor(type: TransactionType): string {
  const incomeTypes: TransactionType[] = ['recharge', 'gift']
  return incomeTypes.includes(type) ? '#52c41a' : '#f5222d'
}

function getAmountPrefix(type: TransactionType): string {
  const incomeTypes: TransactionType[] = ['recharge', 'gift']
  return incomeTypes.includes(type) ? '+' : '-'
}

function formatDateTime(date: string): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

async function loadData() {
  loading.value = true
  try {
    const res = await getTransactionList({
      page: pagination.current,
      pageSize: pagination.pageSize,
      type: queryForm.type,
      startDate: queryForm.startDate,
      endDate: queryForm.endDate,
    })
    dataSource.value = res.list
    pagination.total = res.total
  } finally {
    loading.value = false
  }
}

function handleDateChange(dates: [Dayjs | null, Dayjs | null] | null) {
  if (dates && dates[0] && dates[1]) {
    queryForm.startDate = dates[0].format('YYYY-MM-DD')
    queryForm.endDate = dates[1].format('YYYY-MM-DD')
  } else {
    queryForm.startDate = undefined
    queryForm.endDate = undefined
  }
}

function handleSearch() {
  pagination.current = 1
  loadData()
}

function handleReset() {
  queryForm.keyword = ''
  queryForm.type = undefined
  queryForm.startDate = undefined
  queryForm.endDate = undefined
  dateRange.value = [null, null]
  pagination.current = 1
  loadData()
}

function handleTableChange(pag: any) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadData()
}

function handleExport() {
  message.info('导出功能开发中')
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.page {
  padding: 24px;
}

.page-header {
  margin-bottom: 16px;
}
</style>
