import { Router, Request, Response } from "express";
import dayjs from "dayjs";
import { MealAccount, AccountStatus } from "../models/MealAccount";
import { Elderly } from "../models/Elderly";
import { Canteen } from "../models/Canteen";
import { authMiddleware, requireRoles } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      pageSize = "10",
      status = "",
      keyword = "",
      canteenId = "",
      lowBalance = "false",
    } = req.query;

    const query: any = {};

    if (status) query.status = status;

    const pageNum = parseInt(page as string, 10);
    const size = parseInt(pageSize as string, 10);
    const skip = (pageNum - 1) * size;

    let elderlyQuery: any = {};
    if (keyword) {
      elderlyQuery.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { idCard: { $regex: keyword, $options: "i" } },
        { phone: { $regex: keyword, $options: "i" } },
      ];
    }
    if (req.user?.role === "canteen" && req.user.canteenId) {
      elderlyQuery.canteenId = req.user.canteenId;
    } else if (canteenId) {
      elderlyQuery.canteenId = canteenId;
    }

    const elderlyIds =
      Object.keys(elderlyQuery).length > 0
        ? (await Elderly.find(elderlyQuery).select("_id")).map((e) => e._id)
        : null;

    if (elderlyIds) {
      query.elderlyId = { $in: elderlyIds };
    }

    if (lowBalance === "true") {
      query.balance = { $lt: 20 };
    }

    const [total, list] = await Promise.all([
      MealAccount.countDocuments(query),
      MealAccount.find(query)
        .populate(
          "elderlyId",
          "name age phone subsidyCategory community canteenId",
        )
        .skip(skip)
        .limit(size)
        .sort({ createdAt: -1 }),
    ]);

    const canteenMap = new Map<string, string>();
    const canteens = await Canteen.find({}, "_id name");
    canteens.forEach((c) => canteenMap.set(c._id.toString(), c.name));

    const populatedList = list.map((account) => {
      const acc = account.toObject() as any;
      if (acc.elderlyId?.canteenId) {
        acc.elderlyId.canteenName =
          canteenMap.get(acc.elderlyId.canteenId.toString()) || "";
      }
      return acc;
    });

    res.json({
      total,
      list: populatedList,
      page: pageNum,
      pageSize: size,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "获取账户列表失败" });
  }
});

router.get("/elderly/:elderlyId", async (req: Request, res: Response) => {
  try {
    const account = await MealAccount.findOne({
      elderlyId: req.params.elderlyId,
    }).populate("elderlyId", "name age phone subsidyCategory community");

    if (!account) {
      return res.status(404).json({ message: "账户不存在" });
    }

    if (req.user?.role === "canteen") {
      const elderly = await Elderly.findById(req.params.elderlyId);
      if (elderly?.canteenId.toString() !== req.user.canteenId?.toString()) {
        return res.status(403).json({ message: "无权查看此账户" });
      }
    }

    res.json(account);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "获取账户信息失败" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const account = await MealAccount.findById(req.params.id).populate(
      "elderlyId",
      "name age phone subsidyCategory community",
    );

    if (!account) {
      return res.status(404).json({ message: "账户不存在" });
    }

    if (req.user?.role === "canteen") {
      const elderly = await Elderly.findById(account.elderlyId);
      if (elderly?.canteenId.toString() !== req.user.canteenId?.toString()) {
        return res.status(403).json({ message: "无权查看此账户" });
      }
    }

    res.json(account);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "获取账户信息失败" });
  }
});

router.post(
  "/",
  requireRoles("admin", "worker"),
  async (req: Request, res: Response) => {
    try {
      const { elderlyId } = req.body;

      const elderly = await Elderly.findById(elderlyId);
      if (!elderly) {
        return res.status(404).json({ message: "老人信息不存在" });
      }

      const existingAccount = await MealAccount.findOne({ elderlyId });
      if (existingAccount) {
        return res.status(400).json({ message: "该老人已有就餐账户" });
      }

      const account = new MealAccount({
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

      await account.save();
      await account.populate("elderlyId", "name age phone");

      res.status(201).json(account);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "创建账户失败" });
    }
  },
);

router.patch(
  "/:id/status",
  requireRoles("admin"),
  async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const validStatuses: AccountStatus[] = ["normal", "frozen", "cancelled"];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "无效的账户状态" });
      }

      const account = await MealAccount.findById(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "账户不存在" });
      }

      account.status = status;
      await account.save();
      await account.populate("elderlyId", "name age phone");

      res.json(account);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "更新账户状态失败" });
    }
  },
);

router.get(
  "/:id/reconcile",
  requireRoles("admin", "worker"),
  async (req: Request, res: Response) => {
    try {
      const account = await MealAccount.findById(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "账户不存在" });
      }

      const expectedBalance =
        account.totalRecharge +
        account.totalGift +
        account.totalRefund -
        account.totalConsume;
      const isBalanced =
        Math.abs(account.balance + account.giftBalance - expectedBalance) <
        0.01;

      res.json({
        accountId: account._id,
        currentBalance: account.balance,
        currentGiftBalance: account.giftBalance,
        totalBalance: account.balance + account.giftBalance,
        totalRecharge: account.totalRecharge,
        totalGift: account.totalGift,
        totalConsume: account.totalConsume,
        totalRefund: account.totalRefund,
        expectedBalance,
        isBalanced,
        difference: account.balance + account.giftBalance - expectedBalance,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "对账失败" });
    }
  },
);

router.get(
  "/stats/summary",
  requireRoles("admin", "worker"),
  async (req: Request, res: Response) => {
    try {
      const [
        totalAccounts,
        activeAccounts,
        frozenAccounts,
        lowBalanceAccounts,
        balanceStats,
        rechargeStats,
        consumeStats,
      ] = await Promise.all([
        MealAccount.countDocuments({ status: { $ne: "cancelled" } }),
        MealAccount.countDocuments({ status: "normal" }),
        MealAccount.countDocuments({ status: "frozen" }),
        MealAccount.countDocuments({ status: "normal", balance: { $lt: 20 } }),
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
        MealAccount.aggregate([
          { $group: { _id: null, total: { $sum: "$totalRecharge" } } },
        ]),
        MealAccount.aggregate([
          { $group: { _id: null, total: { $sum: "$totalConsume" } } },
        ]),
      ]);

      const balanceData = balanceStats[0] || {
        totalBalance: 0,
        totalGiftBalance: 0,
      };
      const rechargeData = rechargeStats[0] || { total: 0 };
      const consumeData = consumeStats[0] || { total: 0 };

      const thirtyDaysAgo = dayjs().subtract(30, "day").toDate();
      const inactiveAccounts = await MealAccount.countDocuments({
        status: "normal",
        balance: { $gt: 0 },
        $or: [
          { lastConsumeAt: { $lt: thirtyDaysAgo } },
          { lastConsumeAt: { $exists: false } },
        ],
      });

      res.json({
        totalAccounts,
        activeAccounts,
        frozenAccounts,
        lowBalanceAccounts,
        inactiveAccounts,
        totalBalance: balanceData.totalBalance,
        totalGiftBalance: balanceData.totalGiftBalance,
        totalAllBalance:
          balanceData.totalBalance + balanceData.totalGiftBalance,
        totalRecharge: rechargeData.total,
        totalConsume: consumeData.total,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "获取账户统计失败" });
    }
  },
);

export default router;
