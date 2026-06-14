import mongoose from "mongoose";

export interface IMonthlyBill extends mongoose.Document {
  elderlyId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  month: string;
  startBalance: number;
  startGiftBalance: number;
  endBalance: number;
  endGiftBalance: number;
  totalRecharge: number;
  totalGift: number;
  totalConsume: number;
  totalSubsidyDeduction: number;
  totalRefund: number;
  consumeCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const monthlyBillSchema = new mongoose.Schema<IMonthlyBill>(
  {
    elderlyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Elderly",
      required: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MealAccount",
      required: true,
    },
    month: { type: String, required: true },
    startBalance: { type: Number, required: true, default: 0 },
    startGiftBalance: { type: Number, required: true, default: 0 },
    endBalance: { type: Number, required: true, default: 0 },
    endGiftBalance: { type: Number, required: true, default: 0 },
    totalRecharge: { type: Number, required: true, default: 0 },
    totalGift: { type: Number, required: true, default: 0 },
    totalConsume: { type: Number, required: true, default: 0 },
    totalSubsidyDeduction: { type: Number, required: true, default: 0 },
    totalRefund: { type: Number, required: true, default: 0 },
    consumeCount: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

monthlyBillSchema.index({ elderlyId: 1, month: 1 }, { unique: true });
monthlyBillSchema.index({ accountId: 1, month: 1 });
monthlyBillSchema.index({ month: 1 });

export const MonthlyBill = mongoose.model<IMonthlyBill>(
  "MonthlyBill",
  monthlyBillSchema,
);
