<template>
  <div class="page">
    <div class="page-header">
      <h2>充值管理</h2>
    </div>

    <a-row :gutter="24">
      <a-col :span="14">
        <a-card title="充值信息" class="info-card">
          <a-form
            ref="formRef"
            :model="formData"
            layout="vertical"
          >
            <a-form-item
              label="选择老人"
              name="elderlyId"
              :rules="[{ required: true, message: '请选择老人' }]"
            >
              <a-select
                v-model:value="formData.elderlyId"
                placeholder="搜索老人姓名/身份证/电话"
                show-search
                :filter-option="false"
                :loading="elderlyLoading"
                @search="handleElderlySearch"
                @change="handleElderlyChange"
              >
                <a-select-option v-for="e in elderlyList" :key="e._id" :value="e._id">
                  {{ e.name }} - {{ e.phone }}
                </a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item
              label="充值金额"
              name="rechargeAmount"
              :rules="[{ required: true, message: '请输入充值金额' }]"
            >
              <a-input-number
                v-model:value="formData.rechargeAmount"
                :min="1"
                :step="100"
                style="width: 100%"
                placeholder="请输入充值金额"
                @change="handleAmountChange"
                addon-after="元"
              />
            </a-form-item>

            <a-form-item
              label="充值方式"
              name="method"
              :rules="[{ required: true, message: '请选择充值方式' }]"
            >
              <a-radio-group v-model:value="formData.method">
                <a-radio value="cash">现金</a-radio>
                <a-radio value="wechat">微信</a-radio>
                <a-radio value="alipay">支付宝</a-radio>
                <a-radio value="bank_transfer">银行转账</a-radio>
                <a-radio value="family">家属代充</a-radio>
              </a-radio-group>
            </a-form-item>

            <a-form-item
              label="家属代充"
              name="isFamilyRecharge"
            >
              <a-switch
                v-model:checked="formData.isFamilyRecharge"
                @change="handleFamilyToggle"
              />
              <span style="margin-left: 8px; color: #666">开启后需填写家属姓名</span>
            </a-form-item>

            <a-form-item
              v-if="formData.isFamilyRecharge || formData.method === 'family'"
              label="家属姓名"
              name="familyName"
              :rules="[{ required: true, message: '请输入家属姓名' }]"
            >
              <a-input v-model:value="formData.familyName" placeholder="请输入家属姓名" />
            </a-form-item>

            <a-form-item
              label="充值人姓名"
              name="rechargePerson"
              :rules="[{ required: true, message: '请输入充值人姓名' }]"
            >
              <a-input v-model:value="formData.rechargePerson" placeholder="请输入充值人姓名" />
            </a-form-item>

            <a-form-item label="充值备注" name="remark">
              <a-textarea
                v-model:value="formData.remark"
                :rows="3"
                placeholder="请输入备注信息（选填）"
              />
            </a-form-item>
          </a-form>
        </a-card>
      </a-col>

      <a-col :span="10">
        <a-card title="充值优惠" class="promotion-card">
          <div v-if="promotions.length > 0" class="promotion-rules">
            <div
              v-for="(promo, index) in promotions"
              :key="promo._id"
              class="promotion-item"
              :class="{ active: currentPromotionIndex === index }"
            >
              <div class="promotion-amount">
                充 {{ promo.rechargeAmount }} 送
                <span class="gift-amount">{{ promo.giftAmount }}</span>
              </div>
              <div v-if="promo.description" class="promotion-desc">{{ promo.description }}</div>
              <a-tag v-if="currentPromotionIndex === index" color="green" class="current-tag">
                当前可享
              </a-tag>
            </div>
          </div>
          <a-empty v-else description="暂无优惠活动" />
        </a-card>

        <a-card title="充值确认" class="confirm-card">
          <div class="confirm-info">
            <div class="confirm-row">
              <span class="label">充值金额：</span>
              <span class="value amount">{{ formData.rechargeAmount || 0 }} 元</span>
            </div>
            <div class="confirm-row">
              <span class="label">赠送金额：</span>
              <span class="value gift">+{{ giftAmount }} 元</span>
            </div>
            <div class="confirm-divider"></div>
            <div class="confirm-row total">
              <span class="label">到账金额：</span>
              <span class="value total-amount">{{ totalAmount }} 元</span>
            </div>
          </div>

          <a-button
            type="primary"
            size="large"
            block
            :loading="submitLoading"
            :disabled="!canSubmit"
            @click="handleSubmit"
          >
            <WalletOutlined />
            确认充值
          </a-button>
        </a-card>

        <a-card v-if="selectedElderly" title="老人账户信息" class="account-card">
          <a-descriptions :column="1" size="small">
            <a-descriptions-item label="姓名">{{ selectedElderly.name }}</a-descriptions-item>
            <a-descriptions-item label="电话">{{ selectedElderly.phone }}</a-descriptions-item>
            <a-descriptions-item label="社区">{{ selectedElderly.community }}</a-descriptions-item>
            <a-descriptions-item label="补贴类别">
              {{ getSubsidyText(selectedElderly.subsidyCategory) }}
            </a-descriptions-item>
            <a-descriptions-item v-if="accountInfo" label="当前余额">
              ¥{{ accountInfo.balance?.toFixed(2) }}
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { WalletOutlined } from '@ant-design/icons-vue'
import { getElderlyList, ElderlyItem } from '@/api/elderly'
import {
  getRechargePromotions,
  RechargePromotion,
  createRecharge,
  calculateGift,
} from '@/api/recharges'
import { getAccountByElderlyId, AccountItem } from '@/api/accounts'

const formRef = ref()
const submitLoading = ref(false)
const elderlyLoading = ref(false)

const elderlyList = ref<ElderlyItem[]>([])
const selectedElderly = ref<ElderlyItem | null>(null)
const accountInfo = ref<AccountItem | null>(null)
const promotions = ref<RechargePromotion[]>([])
const giftAmount = ref(0)

const formData = reactive({
  elderlyId: '' as string | undefined,
  rechargeAmount: undefined as number | undefined,
  method: 'cash' as string,
  rechargePerson: '',
  isFamilyRecharge: false,
  familyName: '',
  remark: '',
})

const canSubmit = computed(() => {
  if (!formData.elderlyId || !formData.rechargeAmount || formData.rechargeAmount <= 0) return false
  if (!formData.rechargePerson) return false
  if ((formData.isFamilyRecharge || formData.method === 'family') && !formData.familyName) return false
  return true
})

const totalAmount = computed(() => {
  return (formData.rechargeAmount || 0) + giftAmount.value
})

const currentPromotionIndex = computed(() => {
  const amount = formData.rechargeAmount || 0
  if (amount <= 0) return -1
  const activePromos = promotions.value.filter(p => p.status === 'active')
  for (let i = activePromos.length - 1; i >= 0; i--) {
    if (amount >= activePromos[i].rechargeAmount) {
      return promotions.value.indexOf(activePromos[i])
    }
  }
  return -1
})

function getSubsidyText(category: string): string {
  const map: Record<string, string> = {
    low_income_full: '低保户全额补贴',
    low_income: '低收入补贴',
    normal: '普通补贴',
  }
  return map[category] || category
}

async function loadElderly(keyword = '') {
  elderlyLoading.value = true
  try {
    const res = await getElderlyList({
      page: 1,
      pageSize: 50,
      keyword,
    })
    elderlyList.value = res.list
  } finally {
    elderlyLoading.value = false
  }
}

async function loadPromotions() {
  try {
    const res = await getRechargePromotions()
    promotions.value = res
      .filter(p => p.status === 'active')
      .sort((a, b) => a.rechargeAmount - b.rechargeAmount)
  } catch (e) {
    console.error(e)
  }
}

function handleElderlySearch(value: string) {
  loadElderly(value)
}

async function handleElderlyChange(value: string) {
  const elderly = elderlyList.value.find(e => e._id === value)
  selectedElderly.value = elderly || null
  accountInfo.value = null
  if (value) {
    try {
      accountInfo.value = await getAccountByElderlyId(value)
    } catch (e) {
      console.error(e)
    }
  }
}

function handleAmountChange() {
  computeGiftAmount()
}

function handleFamilyToggle(checked: boolean) {
  if (checked && formData.method !== 'family') {
    formData.method = 'family'
  }
}

async function computeGiftAmount() {
  const amount = formData.rechargeAmount || 0
  if (amount <= 0) {
    giftAmount.value = 0
    return
  }
  try {
    const res = await calculateGift(amount)
    giftAmount.value = res.giftAmount
  } catch (e) {
    const activePromos = promotions.value
      .filter(p => p.status === 'active')
      .sort((a, b) => b.rechargeAmount - a.rechargeAmount)
    let computed = 0
    for (const promo of activePromos) {
      if (amount >= promo.rechargeAmount) {
        computed = promo.giftAmount
        break
      }
    }
    giftAmount.value = computed
  }
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch (e) {
    return
  }

  submitLoading.value = true
  try {
    const data: any = {
      elderlyId: formData.elderlyId,
      rechargeAmount: formData.rechargeAmount,
      method: formData.method,
      rechargePerson: formData.rechargePerson,
      isFamilyRecharge: formData.isFamilyRecharge || formData.method === 'family',
      remark: formData.remark,
    }

    if (formData.isFamilyRecharge || formData.method === 'family') {
      data.familyName = formData.familyName
    }

    await createRecharge(data)
    message.success('充值成功')

    formData.elderlyId = undefined
    formData.rechargeAmount = undefined
    formData.method = 'cash'
    formData.rechargePerson = ''
    formData.isFamilyRecharge = false
    formData.familyName = ''
    formData.remark = ''
    giftAmount.value = 0
    selectedElderly.value = null
    accountInfo.value = null
  } finally {
    submitLoading.value = false
  }
}

onMounted(() => {
  loadElderly()
  loadPromotions()
})
</script>

<style scoped>
.page {
  padding: 24px;
}

.page-header {
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
}

.info-card,
.promotion-card,
.confirm-card,
.account-card {
  margin-bottom: 16px;
}

.promotion-rules {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.promotion-item {
  padding: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  position: relative;
  transition: all 0.3s;
  background: #fafafa;
}

.promotion-item.active {
  border-color: #52c41a;
  background: #f6ffed;
}

.promotion-amount {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.gift-amount {
  color: #f5222d;
  font-size: 20px;
  font-weight: bold;
  margin-left: 4px;
}

.promotion-desc {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.current-tag {
  position: absolute;
  top: 8px;
  right: 8px;
}

.confirm-info {
  padding: 16px 0;
}

.confirm-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.confirm-row .label {
  color: #666;
  font-size: 14px;
}

.confirm-row .value {
  font-size: 16px;
  font-weight: 500;
}

.confirm-row .value.amount {
  color: #333;
}

.confirm-row .value.gift {
  color: #52c41a;
}

.confirm-divider {
  height: 1px;
  background: #f0f0f0;
  margin: 12px 0;
}

.confirm-row.total {
  padding-top: 12px;
}

.confirm-row.total .label {
  font-size: 16px;
  font-weight: 500;
}

.confirm-row.total .total-amount {
  font-size: 24px;
  color: #1890ff;
  font-weight: bold;
}
</style>
