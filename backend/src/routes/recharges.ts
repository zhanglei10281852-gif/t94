import { Router, Request, Response } from "express";
import { MealAccount } from "../models/MealAccount";
import {
  RechargeRecord,
  generateRechargeNo,
  RechargeMethod,
} from "../models/RechargeRecord";
import {
  RechargePromotion,
  calculateGiftAmount,
} from "../models/RechargePromotion";
import { AccountTransaction } from "../models/AccountTransaction";
import { Elderly } from "../models/Elderly";
import { authMiddleware, requireRoles } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.get("/promotions", async (req: Request, res: Response) => {
  try {
    const { status = "active" } = req.query;
    const query: any = {};
    if (status && status !== "all") {
      query.status = status;
    }

    const promotions = await RechargePromotion.find(query).sort({
      sortOrder: 1,
      rechargeAmount: 1,
    });

    res.json(promotions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "获取充值优惠规则失败" });
  }
});

router.post(
  "/promotions",
  requireRoles("admin"),
  async (req: Request, res: Response) => {
    try {
      const {
        name,
        rechargeAmount,
        giftAmount,
        sortOrder = 0,
        description = "",
      } = req.body;

      if (!name || rechargeAmount === undefined || giftAmount === undefined) {
        return res.status(400).json({ message: "请填写完整的优惠规则信息" });
      }

      const promotion = new RechargePromotion({
        name,
        rechargeAmount,
        giftAmount,
        sortOrder,
        description,
        status: "active",
      });

      await promotion.save();
      res.status(201).json(promotion);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "创建充值优惠规则失败" });
    }
  },
);

router.patch(
  "/promotions/:id",
  requireRoles("admin"),
  async (req: Request, res: Response) => {
    try {
      const {
        name,
        rechargeAmount,
        giftAmount,
        status,
        sortOrder,
        description,
      } = req.body;

      const promotion = await RechargePromotion.findById(req.params.id);
      if (!promotion) {
        return res.status(404).json({ message: "优惠规则不存在" });
      }

      if (name !== undefined) promotion.name = name;
      if (rechargeAmount !== undefined)
        promotion.rechargeAmount = rechargeAmount;
      if (giftAmount !== undefined) promotion.giftAmount = giftAmount;
      if (status !== undefined) promotion.status = status;
      if (sortOrder !== undefined) promotion.sortOrder = sortOrder;
      if (description !== undefined) promotion.description = description;

      await promotion.save();
      res.json(promotion);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "更新充值优惠规则失败" });
    }
  },
);

router.delete(
  "/promotions/:id",
  requireRoles("admin"),
  async (req: Request, res: Response) => {
    try {
      const promotion = await RechargePromotion.findById(req.params.id);
      if (!promotion) {
        return res.status(404).json({ message: "优惠规则不存在" });
      }

      await promotion.deleteOne();
      res.json({ message: "删除成功" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "删除充值优惠规则失败" });
    }
  },
);

router.get("/calculate-gift", async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;
    const rechargeAmount = parseFloat(amount as string);

    if (isNaN(rechargeAmount) || rechargeAmount <= 0) {
      return res.status(400).json({ message: "请输入有效的充值金额" });
    }

    const promotions = await RechargePromotion.find({ status: "active" });
    const giftAmount = calculateGiftAmount(rechargeAmount, promotions);

    let matchedPromotion = null;
    for (const promotion of promotions) {
      if (
        promotion.status === "active" &&
        rechargeAmount >= promotion.rechargeAmount &&
        promotion.giftAmount === giftAmount
      ) {
        matchedPromotion = promotion;
        break;
      }
    }

    res.json({
      rechargeAmount,
      giftAmount,
      totalAmount: rechargeAmount + giftAmount,
      matchedPromotion,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "计算赠送金额失败" });
  }
});

router.post(
  "/",
  requireRoles("admin", "worker"),
  async (req: Request, res: Response) => {
    try {
      const {
        elderlyId,
        rechargeAmount,
        method,
        rechargePerson,
        isFamilyRecharge = false,
        familyName = "",
        remark = "",
      } = req.body;

      if (!elderlyId || !rechargeAmount || !method || !rechargePerson) {
        return res.status(400).json({ message: "请填写完整的充值信息" });
      }

      const amount = parseFloat(rechargeAmount);
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "充值金额必须大于0" });
      }

      const validMethods: RechargeMethod[] = [
        "cash",
        "wechat",
        "alipay",
        "bank_transfer",
        "family",
      ];
      if (!validMethods.includes(method)) {
        return res.status(400).json({ message: "无效的充值方式" });
      }

      const elderly = await Elderly.findById(elderlyId);
      if (!elderly) {
        return res.status(404).json({ message: "老人信息不存在" });
      }

      if (
        req.user?.role === "canteen" &&
        elderly.canteenId.toString() !== req.user.canteenId?.toString()
      ) {
        return res.status(403).json({ message: "无权为该老人充值" });
      }

      let account = await MealAccount.findOne({ elderlyId });
      if (!account) {
        account = new MealAccount({
          elderlyId,
          balance: 0,
          giftBalance: 0,
          totalRecharge: 0,
          totalGift: 0,
          totalConsume: 0,
          totalSubsidyDeduction: 0,
          totalRefund: 0,
          status: "normal",
        });
      }

      if (account.status !== "normal") {
        return res.status(400).json({ message: "账户状态异常，无法充值" });
      }

      const promotions = await RechargePromotion.find({ status: "active" });
      const giftAmount = calculateGiftAmount(amount, promotions);

      let matchedPromotion = null;
      for (const promotion of promotions) {
        if (
          promotion.status === "active" &&
          amount >= promotion.rechargeAmount &&
          promotion.giftAmount === giftAmount
        ) {
          matchedPromotion = promotion;
          break;
        }
      }

      const balanceBefore = account.balance;
      const giftBalanceBefore = account.giftBalance;

      account.balance += amount;
      account.giftBalance += giftAmount;
      account.totalRecharge += amount;
      account.totalGift += giftAmount;

      const rechargeNo = generateRechargeNo();

      const rechargeRecord = new RechargeRecord({
        rechargeNo,
        accountId: account._id,
        elderlyId,
        rechargeAmount: amount,
        giftAmount,
        totalAmount: amount + giftAmount,
        method,
        rechargePerson,
        isFamilyRecharge,
        familyName: isFamilyRecharge ? familyName : undefined,
        operatorId: req.user?._id,
        promotionId: matchedPromotion?._id,
        status: "success",
        remark,
      });

      const rechargeTransaction = new AccountTransaction({
        accountId: account._id,
        elderlyId,
        type: "recharge",
        amount: amount,
        balanceBefore,
        balanceAfter: account.balance,
        giftBalanceBefore,
        giftBalanceAfter: account.giftBalance,
        relatedRechargeId: rechargeRecord._id,
        remark: `充值 ${amount} 元`,
        operatorId: req.user?._id,
      });

      let giftTransaction = null;
      if (giftAmount > 0) {
        giftTransaction = new AccountTransaction({
          accountId: account._id,
          elderlyId,
          type: "gift",
          amount: giftAmount,
          balanceBefore,
          balanceAfter: account.balance,
          giftBalanceBefore,
          giftBalanceAfter: account.giftBalance,
          relatedRechargeId: rechargeRecord._id,
          remark: `充值赠送 ${giftAmount} 元`,
          operatorId: req.user?._id,
        });
      }

      await account.save();
      await rechargeRecord.save();
      await rechargeTransaction.save();
      if (giftTransaction) {
        await giftTransaction.save();
      }

      await rechargeRecord.populate("elderlyId", "name age phone");

      res.status(201).json({
        account,
        rechargeRecord,
        giftAmount,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "充值失败" });
    }
  },
);

router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      pageSize = "10",
      elderlyId = "",
      method = "",
      startDate = "",
      endDate = "",
    } = req.query;

    const query: any = {};

    if (elderlyId) query.elderlyId = elderlyId;
    if (method) query.method = method;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setDate(end.getDate() + 1);
        query.createdAt.$lt = end;
      }
    }

    if (req.user?.role === "canteen" && req.user.canteenId) {
      const elderlyList = await Elderly.find(
        { canteenId: req.user.canteenId },
        "_id",
      );
      const elderlyIds = elderlyList.map((e) => e._id);
      query.elderlyId = { $in: elderlyIds };
    }

    const pageNum = parseInt(page as string, 10);
    const size = parseInt(pageSize as string, 10);
    const skip = (pageNum - 1) * size;

    const [total, list] = await Promise.all([
      RechargeRecord.countDocuments(query),
      RechargeRecord.find(query)
        .populate("elderlyId", "name age phone")
        .populate("operatorId", "name")
        .skip(skip)
        .limit(size)
        .sort({ createdAt: -1 }),
    ]);

    res.json({
      total,
      list,
      page: pageNum,
      pageSize: size,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "获取充值记录失败" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const record = await RechargeRecord.findById(req.params.id)
      .populate("elderlyId", "name age phone")
      .populate("operatorId", "name");

    if (!record) {
      return res.status(404).json({ message: "充值记录不存在" });
    }

    res.json(record);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "获取充值记录详情失败" });
  }
});

export default router;
