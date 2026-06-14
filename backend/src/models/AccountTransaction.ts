import mongoose from "mongoose";

export type TransactionType =
  | "recharge"
  | "gift"
  | "consume"
  | "refund"
  | "subsidy_deduction";

export type RechargeMethod =
  | "cash"
  | "wechat"
  | "alipay"
  | "bank_transfer"
  | "family";

export interface IAccountTransaction extends mongoose.Document {
  accountId: mongoose.Types.ObjectId;
  elderlyId: mongoose.Types.ObjectId;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  giftBalanceBefore: number;
  giftBalanceAfter: number;
  relatedOrderId?: mongoose.Types.ObjectId;
  relatedRechargeId?: mongoose.Types.ObjectId;
  remark?: string;
  operatorId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const accountTransactionSchema = new mongoose.Schema<IAccountTransaction>(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MealAccount",
      required: true,
    },
    elderlyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Elderly",
      required: true,
    },
    type: {
      type: String,
      enum: ["recharge", "gift", "consume", "refund", "subsidy_deduction"],
      required: true,
    },
    amount: { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    giftBalanceBefore: { type: Number, required: true, default: 0 },
    giftBalanceAfter: { type: Number, required: true, default: 0 },
    relatedOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    relatedRechargeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RechargeRecord",
    },
    remark: String,
    operatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

accountTransactionSchema.index({ accountId: 1, createdAt: -1 });
accountTransactionSchema.index({ elderlyId: 1, createdAt: -1 });
accountTransactionSchema.index({ type: 1, createdAt: -1 });
accountTransactionSchema.index({ relatedOrderId: 1 });

export const AccountTransaction = mongoose.model<IAccountTransaction>(
  "AccountTransaction",
  accountTransactionSchema,
);
