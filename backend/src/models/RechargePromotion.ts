import mongoose from 'mongoose';

export type PromotionStatus = 'active' | 'inactive';

export interface IRechargePromotion extends mongoose.Document {
  name: string;
  rechargeAmount: number;
  giftAmount: number;
  status: PromotionStatus;
  sortOrder: number;
  description?: string;
}

const rechargePromotionSchema = new mongoose.Schema<IRechargePromotion>({
  name: { type: String, required: true },
  rechargeAmount: { type: Number, required: true, min: 0 },
  giftAmount: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    required: true,
  },
  sortOrder: { type: Number, default: 0 },
  description: String,
}, { timestamps: true });

rechargePromotionSchema.index({ status: 1, sortOrder: 1 });

export const RechargePromotion = mongoose.model<IRechargePromotion>(
  'RechargePromotion',
  rechargePromotionSchema,
);

export function calculateGiftAmount(
  rechargeAmount: number,
  promotions: IRechargePromotion[],
): number {
  let giftAmount = 0;
  const activePromotions = promotions.filter((p) => p.status === 'active');

  for (const promotion of activePromotions) {
    if (rechargeAmount >= promotion.rechargeAmount) {
      if (promotion.giftAmount > giftAmount) {
        giftAmount = promotion.giftAmount;
      }
    }
  }

  return giftAmount;
}
