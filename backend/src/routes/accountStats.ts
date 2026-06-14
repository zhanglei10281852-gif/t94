import { Router, Request, Response } from "express";
import dayjs from "dayjs";
import { MealAccount } from "../models/MealAccount";
import { RechargeRecord } from "../models/RechargeRecord";
import { AccountTransaction } from "../models/AccountTransaction";
import { Order } from "../models/Order";
import { Canteen } from "../models/Canteen";
import { authMiddleware, requireRoles } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);
router.use(requireRoles("admin", "worker"));

const LOW_BALANCE_THRESHOLD = 20;

router.get("/overview", async (req: Request, res: Response) => {
  try {
    const monthStart = dayjs().startOf("month").toDate();
    const monthEnd = dayjs().endOf("month").toDate();

    const [
      totalAccounts,
      activeAccounts,
      frozenAccounts,
      lowBalanceAccounts,
      balanceStats,
      monthRechargeStats,
      monthConsumeStats,
    ] = await Promise.all([
      MealAccount.countDocuments({ status: { $ne: "cancelled" } }),
      MealAccount.countDocuments({ status: "normal" }),
      MealAccount.countDocuments({ status: "frozen" }),
      MealAccount.countDocuments({
        status: "normal",
        balance: { $lt: LOW_BALANCE_THRESHOLD },
      }),
      MealAccount.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        {
          $group: {
            _id: null,
            totalBalance: { $sum: "$balance" },
            totalGiftBalance: { $sum: "$giftBalance" },
          },
        },
      ]),
      RechargeRecord.aggregate([
        {
          $match: {
            status: "success",
            createdAt: { $gte: monthStart, $lte: monthEnd },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$rechargeAmount" },
          },
        },
      ]),
      AccountTransaction.aggregate([
        {
          $match: {
            type: "consume",
            createdAt: { $gte: monthStart, $lte: monthEnd },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const stats = balanceStats[0] || { totalBalance: 0, totalGiftBalance: 0 };
    const monthRecharge = monthRechargeStats[0] || { total: 0 };
    const monthConsume = monthConsumeStats[0] || { total: 0 };

    res.json({
      totalAccounts,
      activeAccounts,
      frozenAccounts,
      lowBalanceAccounts,
      totalBalance: stats.totalBalance,
      totalGiftBalance: stats.totalGiftBalance,
      monthRechargeAmount: monthRecharge.total,
      monthConsumeAmount: monthConsume.total,
      lowBalanceThreshold: LOW_BALANCE_THRESHOLD,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "获取账户总览统计失败" });
  }
});

router.get("/monthly-trend", async (req: Request, res: Response) => {
  try {
    const months: Array<{
      month: string;
      rechargeTotal: number;
      consumeTotal: number;
    }> = [];

    const today = dayjs();
    for (let i = 11; i >= 0; i--) {
      const month = today.subtract(i, "month");
      months.push({
        month: month.format("YYYY-MM"),
        rechargeTotal: 0,
        consumeTotal: 0,
      });
    }

    const startDate = today.subtract(11, "month").startOf("month").toDate();
    const endDate = today.endOf("month").toDate();

    const [rechargeStats, consumeStats] = await Promise.all([
      RechargeRecord.aggregate([
        {
          $match: {
            status: "success",
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            total: { $sum: "$rechargeAmount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      AccountTransaction.aggregate([
        {
          $match: {
            type: "consume",
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
    ]);

    const rechargeMap = new Map<string, number>();
    rechargeStats.forEach((item: any) => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, "0")}`;
      rechargeMap.set(key, item.total);
    });

    const consumeMap = new Map<string, number>();
    consumeStats.forEach((item: any) => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, "0")}`;
      consumeMap.set(key, item.total);
    });

    const result = months.map((m) => ({
      month: m.month,
      rechargeTotal: rechargeMap.get(m.month) || 0,
      consumeTotal: consumeMap.get(m.month) || 0,
    }));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "获取月度趋势统计失败" });
  }
});

router.get("/canteen-distribution", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.mealDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const stats = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" }, ...dateFilter } },
      {
        $group: {
          _id: "$canteenId",
          orderCount: { $sum: 1 },
          totalAmount: { $sum: "$selfPayAmount" },
          totalSubsidy: { $sum: "$subsidyAmount" },
        },
      },
      {
        $lookup: {
          from: "canteens",
          localField: "_id",
          foreignField: "_id",
          as: "canteen",
        },
      },
      { $unwind: "$canteen" },
      {
        $project: {
          canteenId: "$_id",
          canteenName: "$canteen.name",
          orderCount: 1,
          totalAmount: 1,
          totalSubsidy: 1,
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "获取助餐点消费分布失败" });
  }
});

router.get("/balance-distribution", async (req: Request, res: Response) => {
  try {
    const ranges = [
      { min: 0, max: 20, label: "0-20" },
      { min: 20, max: 50, label: "20-50" },
      { min: 50, max: 100, label: "50-100" },
      { min: 100, max: 200, label: "100-200" },
      { min: 200, max: 500, label: "200-500" },
      { min: 500, max: Infinity, label: "500+" },
    ];

    const result = await Promise.all(
      ranges.map(async (range) => {
        const count = await MealAccount.countDocuments({
          status: { $ne: "cancelled" },
          balance:
            range.max === Infinity
              ? { $gte: range.min }
              : { $gte: range.min, $lt: range.max },
        });
        return {
          range: range.label,
          count,
        };
      }),
    );

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "获取余额分布统计失败" });
  }
});

router.get("/recharge-method-stats", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter: any = { status: "success" };
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const stats = await RechargeRecord.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$method",
          count: { $sum: 1 },
          totalAmount: { $sum: "$rechargeAmount" },
          totalGift: { $sum: "$giftAmount" },
        },
      },
      {
        $project: {
          method: "$_id",
          count: 1,
          totalAmount: 1,
          totalGift: 1,
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    const methodLabels: Record<string, string> = {
      cash: "现金",
      wechat: "微信",
      alipay: "支付宝",
      bank_transfer: "银行转账",
      family: "家属代充",
    };

    const result = stats.map((item: any) => ({
      ...item,
      methodLabel: methodLabels[item.method] || item.method,
    }));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "获取充值方式统计失败" });
  }
});

export default router;
