import mongoose from 'mongoose';

export type RechargeMethod = 'cash' | 'wechat' | 'alipay' | 'bank_transfer' | 'family';
export type RechargeStatus = 'success' | 'cancelled';

export interface IRechargeRecord extends mongoose.Document {
  rechargeNo: string;
  accountId: mongoose.Types.ObjectId;
  elderlyId: mongoose.Types.ObjectId;
  rechargeAmount: number;
  giftAmount: number;
  totalAmount: number;
  method: RechargeMethod;
  rechargePerson: string;
  isFamilyRecharge: boolean;
  familyName?: string;
  operatorId?: mongoose.Types.ObjectId;
  promotionId?: mongoose.Types.ObjectId;
  status: RechargeStatus;
  remark?: string;
}

const rechargeRecordSchema = new mongoose.Schema<IRechargeRecord>({
  rechargeNo: { type: String, required: true, unique: true },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MealAccount',
    required: true,
  },
  elderlyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Elderly',
    required: true,
  },
  rechargeAmount: { type: Number, required: true, min: 0 },
  giftAmount: { type: Number, required: true, default: 0, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  method: {
    type: String,
    enum: ['cash', 'wechat', 'alipay', 'bank_transfer', 'family'],
    required: true,
  },
  rechargePerson: { type: String, required: true },
  isFamilyRecharge: { type: Boolean, default: false },
  familyName: String,
  operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  promotionId: { type: mongoose.Schema.Types.ObjectId, ref: 'RechargePromotion' },
  status: {
    type: String,
    enum: ['success', 'cancelled'],
    default: 'success',
    required: true,
  },
  remark: String,
}, { timestamps: true });

rechargeRecordSchema.index({ accountId: 1, createdAt: -1 });
rechargeRecordSchema.index({ elderlyId: 1, createdAt: -1 });
rechargeRecordSchema.index({ rechargeNo: 1 }, { unique: true });
rechargeRecordSchema.index({ method: 1, createdAt: -1 });

let rechargeCounter = 0;

export function generateRechargeNo(): string {
  rechargeCounter++;
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.getTime().toString().slice(-6);
  const counterStr = rechargeCounter.toString().padStart(6, '0');
  return `REC${dateStr}${timeStr}${counterStr}`;
}

export const RechargeRecord = mongoose.model<IRechargeRecord>(
  'RechargeRecord',
  rechargeRecordSchema,
);
