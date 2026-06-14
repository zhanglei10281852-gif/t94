import mongoose from 'mongoose';

export type AccountStatus = 'normal' | 'frozen' | 'cancelled';

export interface IMealAccount extends mongoose.Document {
  elderlyId: mongoose.Types.ObjectId;
  balance: number;
  giftBalance: number;
  totalRecharge: number;
  totalGift: number;
  totalConsume: number;
  totalSubsidyDeduction: number;
  totalRefund: number;
  status: AccountStatus;
  lastConsumeAt?: Date;
}

const mealAccountSchema = new mongoose.Schema<IMealAccount>({
  elderlyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Elderly',
    required: true,
    unique: true,
  },
  balance: { type: Number, required: true, default: 0, min: 0 },
  giftBalance: { type: Number, required: true, default: 0, min: 0 },
  totalRecharge: { type: Number, required: true, default: 0, min: 0 },
  totalGift: { type: Number, required: true, default: 0, min: 0 },
  totalConsume: { type: Number, required: true, default: 0, min: 0 },
  totalSubsidyDeduction: { type: Number, required: true, default: 0, min: 0 },
  totalRefund: { type: Number, required: true, default: 0, min: 0 },
  status: {
    type: String,
    enum: ['normal', 'frozen', 'cancelled'],
    default: 'normal',
    required: true,
  },
  lastConsumeAt: Date,
}, { timestamps: true });

mealAccountSchema.index({ elderlyId: 1 }, { unique: true });
mealAccountSchema.index({ status: 1 });
mealAccountSchema.index({ balance: 1 });

export const MealAccount = mongoose.model<IMealAccount>('MealAccount', mealAccountSchema);
