import { Router, Request, Response } from 'express';
import dayjs from 'dayjs';
import { AccountTransaction, TransactionType } from '../models/AccountTransaction';
import { Elderly } from '../models/Elderly';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      pageSize = '10',
      accountId = '',
      elderlyId = '',
      type = '',
      startDate = '',
      endDate = '',
    } = req.query;

    const query: any = {};

    if (accountId) query.accountId = accountId;
    if (elderlyId) query.elderlyId = elderlyId;
    if (type) query.type = type;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) {
        const end = dayjs(endDate as string).add(1, 'day').toDate();
        query.createdAt.$lt = end;
      }
    }

    if (req.user?.role === 'canteen' && req.user.canteenId) {
      const elderlyList = await Elderly.find({ canteenId: req.user.canteenId }, '_id');
      const elderlyIds = elderlyList.map(e => e._id);
      query.elderlyId = { $in: elderlyIds };
    }

    const pageNum = parseInt(page as string, 10);
    const size = parseInt(pageSize as string, 10);
    const skip = (pageNum - 1) * size;

    const [total, list] = await Promise.all([
      AccountTransaction.countDocuments(query),
      AccountTransaction.find(query)
        .populate('elderlyId', 'name age phone')
        .populate('operatorId', 'name')
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
    res.status(500).json({ message: '获取交易流水列表失败' });
  }
});

router.get('/export/csv', async (req: Request, res: Response) => {
  try {
    const {
      accountId = '',
      elderlyId = '',
      type = '',
      startDate = '',
      endDate = '',
    } = req.query;

    const query: any = {};

    if (accountId) query.accountId = accountId;
    if (elderlyId) query.elderlyId = elderlyId;
    if (type) query.type = type;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) {
        const end = dayjs(endDate as string).add(1, 'day').toDate();
        query.createdAt.$lt = end;
      }
    }

    if (req.user?.role === 'canteen' && req.user.canteenId) {
      const elderlyList = await Elderly.find({ canteenId: req.user.canteenId }, '_id');
      const elderlyIds = elderlyList.map(e => e._id);
      query.elderlyId = { $in: elderlyIds };
    }

    const transactions = await AccountTransaction.find(query)
      .populate('elderlyId', 'name age phone')
      .populate('operatorId', 'name')
      .sort({ createdAt: -1 });

    const typeLabels: Record<string, string> = {
      recharge: '充值',
      gift: '赠送',
      consume: '消费',
      refund: '退款',
      subsidy_deduction: '补贴抵扣',
    };

    const header = ['交易ID', '老人姓名', '老人电话', '交易类型', '交易金额', '余额前', '余额后', '赠送余额前', '赠送余额后', '备注', '操作人', '交易时间'].join(',');

    const rows = transactions.map(t => {
      const elderly: any = t.elderlyId;
      const operator: any = t.operatorId;
      return [
        t._id,
        elderly?.name || '',
        elderly?.phone || '',
        typeLabels[t.type] || t.type,
        t.amount.toFixed(2),
        t.balanceBefore.toFixed(2),
        t.balanceAfter.toFixed(2),
        t.giftBalanceBefore.toFixed(2),
        t.giftBalanceAfter.toFixed(2),
        (t.remark || '').replace(/,/g, '，'),
        operator?.name || '',
        dayjs(t.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      ].join(',');
    });

    const csv = header + '\n' + rows.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="transactions-${dayjs().format('YYYYMMDDHHmmss')}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '导出CSV失败' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const transaction = await AccountTransaction.findById(req.params.id)
      .populate('elderlyId', 'name age phone')
      .populate('operatorId', 'name')
      .populate('relatedOrderId')
      .populate('relatedRechargeId');

    if (!transaction) {
      return res.status(404).json({ message: '交易流水不存在' });
    }

    if (req.user?.role === 'canteen' && req.user.canteenId) {
      const elderly = await Elderly.findById(transaction.elderlyId);
      if (!elderly || elderly.canteenId.toString() !== req.user.canteenId.toString()) {
        return res.status(403).json({ message: '无权查看此交易流水' });
      }
    }

    res.json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取交易流水详情失败' });
  }
});

export default router;
