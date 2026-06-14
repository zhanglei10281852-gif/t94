import { Router, Request, Response } from 'express';
import dayjs from 'dayjs';
import { MonthlyBill } from '../models/MonthlyBill';
import { AccountTransaction } from '../models/AccountTransaction';
import { MealAccount } from '../models/MealAccount';
import { Order } from '../models/Order';
import { authMiddleware, requireRoles } from '../middleware/auth';
import { getMonthKey } from '../utils/subsidy';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      pageSize = '10',
      elderlyId = '',
      month = '',
    } = req.query;

    const query: any = {};

    if (elderlyId) query.elderlyId = elderlyId;
    if (month) query.month = month;

    const pageNum = parseInt(page as string, 10);
    const size = parseInt(pageSize as string, 10);
    const skip = (pageNum - 1) * size;

    const [total, list] = await Promise.all([
      MonthlyBill.countDocuments(query),
      MonthlyBill.find(query)
        .populate('elderlyId', 'name age phone')
        .populate('accountId')
        .skip(skip)
        .limit(size)
        .sort({ month: -1 }),
    ]);

    res.json({
      total,
      list,
      page: pageNum,
      pageSize: size,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取账单列表失败' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const bill = await MonthlyBill.findById(req.params.id)
      .populate('elderlyId')
      .populate('accountId');

    if (!bill) {
      return res.status(404).json({ message: '账单不存在' });
    }

    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: '获取账单详情失败' });
  }
});

router.get('/elderly/:elderlyId', async (req: Request, res: Response) => {
  try {
    const bills = await MonthlyBill.find({ elderlyId: req.params.elderlyId })
      .populate('elderlyId', 'name age phone')
      .populate('accountId')
      .sort({ month: -1 });

    res.json(bills);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取老人账单失败' });
  }
});

router.post('/generate', requireRoles('admin'), async (req: Request, res: Response) => {
  try {
    const { month } = req.body;

    if (!month) {
      return res.status(400).json({ message: '请指定月份' });
    }

    const monthDate = new Date(month + '-01');
    if (isNaN(monthDate.getTime())) {
      return res.status(400).json({ message: '无效的月份格式，请使用 YYYY-MM 格式' });
    }

    const monthKey = getMonthKey(monthDate);
    const monthStart = dayjs(monthKey + '-01').startOf('month').toDate();
    const monthEnd = dayjs(monthKey + '-01').endOf('month').toDate();

    const accounts = await MealAccount.find({ status: 'normal' });

    const results = [];

    for (const account of accounts) {
      const transactions = await AccountTransaction.find({
        accountId: account._id,
        createdAt: { $gte: monthStart, $lte: monthEnd },
      }).sort({ createdAt: 1 });

      let totalRecharge = 0;
      let totalGift = 0;
      let totalConsume = 0;
      let totalSubsidyDeduction = 0;
      let totalRefund = 0;
      let consumeCount = 0;

      for (const tx of transactions) {
        switch (tx.type) {
          case 'recharge':
            totalRecharge += tx.amount;
            break;
          case 'gift':
            totalGift += tx.amount;
            break;
          case 'consume':
            totalConsume += tx.amount;
            consumeCount++;
            break;
          case 'subsidy_deduction':
            totalSubsidyDeduction += tx.amount;
            break;
          case 'refund':
            totalRefund += tx.amount;
            break;
        }
      }

      let startBalance = 0;
      let startGiftBalance = 0;

      const lastTxBeforeMonth = await AccountTransaction.findOne({
        accountId: account._id,
        createdAt: { $lt: monthStart },
      }).sort({ createdAt: -1 });

      if (lastTxBeforeMonth) {
        startBalance = lastTxBeforeMonth.balanceAfter;
        startGiftBalance = lastTxBeforeMonth.giftBalanceAfter;
      }

      const endBalance = account.balance;
      const endGiftBalance = account.giftBalance;

      const existingBill = await MonthlyBill.findOne({
        elderlyId: account.elderlyId,
        month: monthKey,
      });

      if (existingBill) {
        existingBill.startBalance = startBalance;
        existingBill.startGiftBalance = startGiftBalance;
        existingBill.endBalance = endBalance;
        existingBill.endGiftBalance = endGiftBalance;
        existingBill.totalRecharge = totalRecharge;
        existingBill.totalGift = totalGift;
        existingBill.totalConsume = totalConsume;
        existingBill.totalSubsidyDeduction = totalSubsidyDeduction;
        existingBill.totalRefund = totalRefund;
        existingBill.consumeCount = consumeCount;
        await existingBill.save();
        results.push(existingBill);
      } else {
        const bill = new MonthlyBill({
          elderlyId: account.elderlyId,
          accountId: account._id,
          month: monthKey,
          startBalance,
          startGiftBalance,
          endBalance,
          endGiftBalance,
          totalRecharge,
          totalGift,
          totalConsume,
          totalSubsidyDeduction,
          totalRefund,
          consumeCount,
        });
        await bill.save();
        results.push(bill);
      }
    }

    res.json({
      message: `成功生成 ${results.length} 条月度账单`,
      count: results.length,
      month: monthKey,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: error.message || '生成账单失败' });
  }
});

router.get('/:id/consume-details', async (req: Request, res: Response) => {
  try {
    const bill = await MonthlyBill.findById(req.params.id);

    if (!bill) {
      return res.status(404).json({ message: '账单不存在' });
    }

    const monthStart = dayjs(bill.month + '-01').startOf('month').toDate();
    const monthEnd = dayjs(bill.month + '-01').endOf('month').toDate();

    const transactions = await AccountTransaction.find({
      accountId: bill.accountId,
      type: 'consume',
      createdAt: { $gte: monthStart, $lte: monthEnd },
    })
      .populate('relatedOrderId')
      .sort({ createdAt: -1 });

    const orderIds = transactions
      .filter(tx => tx.relatedOrderId)
      .map(tx => tx.relatedOrderId);

    const orders = await Order.find({ _id: { $in: orderIds } })
      .populate('elderlyId', 'name')
      .populate('canteenId', 'name')
      .sort({ mealDate: -1, mealType: 1 });

    const details = transactions.map(tx => ({
      transaction: tx,
      order: orders.find(o => o._id.toString() === tx.relatedOrderId?.toString()) || null,
    }));

    res.json({
      bill,
      details,
      totalCount: details.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取消费明细失败' });
  }
});

export default router;
