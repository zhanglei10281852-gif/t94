<template>
  <div class="page">
    <a-row :gutter="16">
      <a-col :span="6">
        <a-card class="stat-card">
          <div class="stat-number" style="color: #1890ff">
            ¥{{ overview.totalBalance?.toFixed(2) }}
          </div>
          <div class="stat-label">账户总余额</div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card class="stat-card">
          <div class="stat-number" style="color: #52c41a">
            {{ overview.totalAccounts }}
          </div>
          <div class="stat-label">账户总数</div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card class="stat-card">
          <div class="stat-number" style="color: #fa8c16">
            ¥{{ overview.monthRechargeAmount?.toFixed(2) }}
          </div>
          <div class="stat-label">本月充值金额</div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card class="stat-card">
          <div class="stat-number" style="color: #eb2f96">
            ¥{{ overview.monthConsumeAmount?.toFixed(2) }}
          </div>
          <div class="stat-label">本月消费金额</div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" style="margin-top: 16px">
      <a-col :span="24">
        <a-card title="月度充值/消费趋势">
          <div ref="trendChart" class="chart-container"></div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" style="margin-top: 16px">
      <a-col :span="12">
        <a-card title="各助餐点消费分布">
          <div ref="canteenChart" class="chart-container"></div>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card title="账户余额分布">
          <div ref="balanceChart" class="chart-container"></div>
        </a-card>
      </a-col>
    </a-row>

    <a-row style="margin-top: 16px">
      <a-col :span="12">
        <a-card title="充值方式统计">
          <div ref="rechargeMethodChart" class="chart-container"></div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import {
  getAccountStatsOverview,
  getMonthlyTrend,
  getCanteenDistribution,
  getBalanceDistribution,
  getRechargeMethodStats,
  AccountStatsOverview,
  MonthlyTrendItem,
  CanteenDistributionItem,
  BalanceDistributionItem,
  RechargeMethodStatItem,
} from '@/api/accountStats'

const overview = ref<AccountStatsOverview>({
  totalAccounts: 0,
  totalBalance: 0,
  activeAccounts: 0,
  frozenAccounts: 0,
  closedAccounts: 0,
  todayRechargeAmount: 0,
  todayRechargeCount: 0,
  todayConsumeAmount: 0,
  todayConsumeCount: 0,
  monthRechargeAmount: 0,
  monthRechargeCount: 0,
  monthConsumeAmount: 0,
  monthConsumeCount: 0,
})

const monthlyTrend = ref<MonthlyTrendItem[]>([])
const canteenDistribution = ref<CanteenDistributionItem[]>([])
const balanceDistribution = ref<BalanceDistributionItem[]>([])
const rechargeMethodStats = ref<RechargeMethodStatItem[]>([])

const trendChart = ref<HTMLElement | null>(null)
const canteenChart = ref<HTMLElement | null>(null)
const balanceChart = ref<HTMLElement | null>(null)
const rechargeMethodChart = ref<HTMLElement | null>(null)

let trendChartInstance: echarts.ECharts | null = null
let canteenChartInstance: echarts.ECharts | null = null
let balanceChartInstance: echarts.ECharts | null = null
let rechargeMethodChartInstance: echarts.ECharts | null = null

async function loadData() {
  try {
    const [overviewRes, trendRes, canteenRes, balanceRes, methodRes] = await Promise.all([
      getAccountStatsOverview(),
      getMonthlyTrend(),
      getCanteenDistribution(),
      getBalanceDistribution(),
      getRechargeMethodStats(),
    ])
    overview.value = overviewRes
    monthlyTrend.value = trendRes
    canteenDistribution.value = canteenRes
    balanceDistribution.value = balanceRes
    rechargeMethodStats.value = methodRes
    await nextTick()
    initCharts()
  } catch (error) {
    console.error('Failed to load account stats', error)
  }
}

function initCharts() {
  initTrendChart()
  initCanteenChart()
  initBalanceChart()
  initRechargeMethodChart()
}

function initTrendChart() {
  if (!trendChart.value) return
  if (trendChartInstance) trendChartInstance.dispose()

  trendChartInstance = echarts.init(trendChart.value)

  const months = monthlyTrend.value.map(i => i.month)
  const rechargeAmounts = monthlyTrend.value.map(i => i.rechargeAmount)
  const consumeAmounts = monthlyTrend.value.map(i => i.consumeAmount)

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let result = `${params[0].axisValue}<br/>`
        params.forEach((item: any) => {
          result += `${item.marker}${item.seriesName}: ¥${item.value.toFixed(2)}<br/>`
        })
        return result
      },
    },
    legend: {
      data: ['充值金额', '消费金额'],
      top: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: 40,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: months,
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '¥{value}',
      },
    },
    series: [
      {
        name: '充值金额',
        type: 'line',
        smooth: true,
        data: rechargeAmounts,
        lineStyle: {
          color: '#52c41a',
          width: 2,
        },
        itemStyle: {
          color: '#52c41a',
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(82, 196, 26, 0.3)' },
            { offset: 1, color: 'rgba(82, 196, 26, 0.05)' },
          ]),
        },
      },
      {
        name: '消费金额',
        type: 'line',
        smooth: true,
        data: consumeAmounts,
        lineStyle: {
          color: '#f5222d',
          width: 2,
        },
        itemStyle: {
          color: '#f5222d',
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(245, 34, 45, 0.3)' },
            { offset: 1, color: 'rgba(245, 34, 45, 0.05)' },
          ]),
        },
      },
    ],
  }

  trendChartInstance.setOption(option)
}

function initCanteenChart() {
  if (!canteenChart.value) return
  if (canteenChartInstance) canteenChartInstance.dispose()

  canteenChartInstance = echarts.init(canteenChart.value)

  const names = canteenDistribution.value.map(i => i.canteenName)
  const amounts = canteenDistribution.value.map(i => i.monthConsumeAmount)

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const item = params[0]
        return `${item.name}<br/>${item.marker}月消费金额: ¥${item.value.toFixed(2)}`
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: names,
      axisLabel: {
        interval: 0,
        rotate: 30,
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '¥{value}',
      },
    },
    series: [
      {
        name: '月消费金额',
        type: 'bar',
        data: amounts,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#1890ff' },
            { offset: 1, color: '#69c0ff' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: '50%',
      },
    ],
  }

  canteenChartInstance.setOption(option)
}

function initBalanceChart() {
  if (!balanceChart.value) return
  if (balanceChartInstance) balanceChartInstance.dispose()

  balanceChartInstance = echarts.init(balanceChart.value)

  const ranges = balanceDistribution.value.map(i => i.range)
  const counts = balanceDistribution.value.map(i => i.count)

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const item = params[0]
        const data = balanceDistribution.value[item.dataIndex]
        return `${item.name}<br/>${item.marker}账户数: ${item.value} 个<br/>占比: ${data.percentage.toFixed(1)}%`
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: ranges,
      axisLabel: {
        interval: 0,
      },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
    },
    series: [
      {
        name: '账户数',
        type: 'bar',
        data: counts,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#722ed1' },
            { offset: 1, color: '#b37feb' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: '60%',
      },
    ],
  }

  balanceChartInstance.setOption(option)
}

function initRechargeMethodChart() {
  if (!rechargeMethodChart.value) return
  if (rechargeMethodChartInstance) rechargeMethodChartInstance.dispose()

  rechargeMethodChartInstance = echarts.init(rechargeMethodChart.value)

  const data = rechargeMethodStats.value.map(item => ({
    value: item.amount,
    name: item.method,
  }))

  const colorList = ['#1890ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96', '#13c2c2']

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const data = rechargeMethodStats.value.find(i => i.method === params.name)
        return `${params.name}<br/>金额: ¥${params.value.toFixed(2)}<br/>笔数: ${data?.count || 0} 笔<br/>占比: ${params.percent}%`
      },
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
    },
    series: [
      {
        name: '充值方式',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['35%', '50%'],
        data: data,
        itemStyle: {
          borderRadius: 4,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          formatter: '{b}\n{d}%',
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        color: colorList,
      },
    ],
  }

  rechargeMethodChartInstance.setOption(option)
}

function handleResize() {
  trendChartInstance?.resize()
  canteenChartInstance?.resize()
  balanceChartInstance?.resize()
  rechargeMethodChartInstance?.resize()
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', handleResize)
})
</script>

<style scoped>
.page {
  padding: 24px;
}

.stat-card {
  text-align: center;
  padding: 20px 0;
}

.stat-number {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.2;
}

.stat-label {
  color: #666;
  font-size: 14px;
  margin-top: 8px;
}

.chart-container {
  width: 100%;
  height: 320px;
}
</style>
