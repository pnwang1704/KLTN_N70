import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { ReportSnapshot } from './entities/report-snapshot.entity';

export interface ReportFilterQuery {
  branchId?: string;
  startDate?: string;
  endDate?: string;
}

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

function toVnDate(input: string | Date): Date {
  const d = typeof input === 'string' ? new Date(input) : input;
  return new Date(d.getTime() + VN_OFFSET_MS);
}

function getVnDateKey(input: string | Date): string {
  const vn = toVnDate(input);
  const y = vn.getUTCFullYear();
  const m = String(vn.getUTCMonth() + 1).padStart(2, '0');
  const day = String(vn.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getVnHour(input: string | Date): number {
  return toVnDate(input).getUTCHours();
}

function todayVnDateKey(): string {
  return getVnDateKey(new Date());
}

function normalizePaymentMethod(raw?: string): string {
  const upper = String(raw || 'CASH').toUpperCase().trim();
  if (upper === 'BANK_TRANSFER' || upper === 'TRANSFER' || upper === 'PAYOS' || upper === 'VIETQR') {
    return 'TRANSFER';
  }
  if (upper === 'QR' || upper === 'MOMO' || upper === 'EWALLET') {
    return 'QR';
  }
  if (upper === 'CARD' || upper === 'POS') {
    return 'CARD';
  }
  return 'CASH';
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Tiền mặt',
  TRANSFER: 'Chuyển khoản / VietQR',
  QR: 'Ví điện tử / QR',
  CARD: 'Thẻ ngân hàng',
};

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
    @InjectRepository(ReportSnapshot)
    private readonly snapshotRepository: Repository<ReportSnapshot>,
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy,
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientProxy,
    @Inject('BRANCH_SERVICE') private readonly branchClient: ClientProxy,
  ) {}

  private normalizeDateRange(query: ReportFilterQuery) {
    const startKey = query.startDate?.slice(0, 10) || todayVnDateKey();
    const endKey = query.endDate?.slice(0, 10) || startKey;
    const fromIso = `${startKey}T00:00:00.000+07:00`;
    const toIso = `${endKey}T23:59:59.999+07:00`;
    return { startKey, endKey, fromIso, toIso, isSingleDay: startKey === endKey };
  }

  private async fetchBranches(): Promise<Array<{ id: string; code: string; name: string }>> {
    const res = await firstValueFrom(
      this.branchClient.send('get_branches', {}).pipe(
        timeout(5000),
        catchError((err) => {
          this.logger.warn(`Fallback branches due to RPC error: ${err?.message}`);
          return of([
            { id: '1', code: 'CN01', name: 'Chi nhánh 1 - Quận 1' },
            { id: '2', code: 'CN02', name: 'Chi nhánh 2 - Bình Thạnh' },
          ]);
        }),
      ),
    );
    return Array.isArray(res) && res.length > 0
      ? res.map((b: any) => ({
          id: String(b.id),
          code: b.code || `CN0${b.id}`,
          name: b.name || `Chi nhánh ${b.id}`,
        }))
      : [
          { id: '1', code: 'CN01', name: 'Chi nhánh 1 - Quận 1' },
          { id: '2', code: 'CN02', name: 'Chi nhánh 2 - Bình Thạnh' },
        ];
  }

  private async fetchOrdersForQuery(query: ReportFilterQuery): Promise<any[]> {
    const { fromIso, toIso } = this.normalizeDateRange(query);
    const branchParam = query.branchId && query.branchId !== 'ALL' ? String(query.branchId) : null;

    if (branchParam) {
      const orders = await firstValueFrom(
        this.orderClient
          .send('get_orders', {
            branchId: branchParam,
            fromDate: fromIso,
            toDate: toIso,
          })
          .pipe(
            timeout(8000),
            catchError((err) => {
              this.logger.error(`Failed fetching orders for branch ${branchParam}: ${err?.message}`);
              return of([]);
            }),
          ),
      );
      return Array.isArray(orders) ? orders : [];
    }

    // Fetch across all branches in parallel
    const branches = await this.fetchBranches();
    const results = await Promise.all(
      branches.map((b) =>
        firstValueFrom(
          this.orderClient
            .send('get_orders', {
              branchId: b.id,
              fromDate: fromIso,
              toDate: toIso,
            })
            .pipe(
              timeout(8000),
              catchError(() => of([])),
            ),
        ),
      ),
    );

    const merged: any[] = [];
    const seen = new Set<string>();
    for (const list of results) {
      if (!Array.isArray(list)) continue;
      for (const order of list) {
        if (order?.id && !seen.has(order.id)) {
          seen.add(order.id);
          merged.push(order);
        }
      }
    }
    return merged;
  }

  private async buildRecipeCostMap(): Promise<Map<string, number>> {
    const [recipes, ingredients] = await Promise.all([
      firstValueFrom(
        this.inventoryClient.send('get_recipes', {}).pipe(
          timeout(6000),
          catchError(() => of([])),
        ),
      ),
      firstValueFrom(
        this.inventoryClient.send('get_ingredients', {}).pipe(
          timeout(6000),
          catchError(() => of([])),
        ),
      ),
    ]);

    const ingCostMap = new Map<string, number>();
    if (Array.isArray(ingredients)) {
      for (const ing of ingredients) {
        ingCostMap.set(String(ing.id), Number(ing.costPerUnit || 0));
      }
    }

    const recipeCostMap = new Map<string, number>();
    if (Array.isArray(recipes)) {
      for (const r of recipes) {
        const items = Array.isArray(r.items) ? r.items : [];
        let unitCost = 0;
        for (const ri of items) {
          const costPerUnit =
            Number(ri.ingredient?.costPerUnit ?? ingCostMap.get(String(ri.ingredientId)) ?? 0);
          unitCost += Number(ri.quantityNeeded || 0) * costPerUnit;
        }
        const key = `${String(r.productId)}_${String(r.size || 'M').toUpperCase()}`;
        recipeCostMap.set(key, Math.round(unitCost));
      }
    }
    return recipeCostMap;
  }

  private computeOrderCogs(order: any, recipeCostMap: Map<string, number>): number {
    const items = Array.isArray(order.items) ? order.items : [];
    let totalCogs = 0;
    for (const item of items) {
      const pid = String(item.productId || '');
      const sz = String(item.size || 'M').toUpperCase();
      const unitCogs =
        recipeCostMap.get(`${pid}_${sz}`) ??
        recipeCostMap.get(`${pid}_M`) ??
        recipeCostMap.get(`${pid}_S`) ??
        0;
      totalCogs += unitCogs * Number(item.quantity || 1);
    }
    return Math.round(totalCogs);
  }

  private isPaidOrder(order: any): boolean {
    const st = String(order?.status || '').toUpperCase();
    return st === 'PAID' || st === 'COMPLETED';
  }

  private isVoidOrCancelled(order: any): boolean {
    const st = String(order?.status || '').toUpperCase();
    return st === 'CANCELLED' || st === 'VOIDED';
  }

  private getOrderRevenue(order: any): number {
    return Math.round(Number(order?.finalAmount ?? order?.totalAmount ?? 0));
  }

  // 1. GET /reports/overview
  async getOverview(query: ReportFilterQuery) {
    const { startKey, endKey } = this.normalizeDateRange(query);
    const [orders, recipeCostMap] = await Promise.all([
      this.fetchOrdersForQuery(query),
      this.buildRecipeCostMap(),
    ]);

    const paidOrders = orders.filter((o) => this.isPaidOrder(o));
    const voidOrCancelOrders = orders.filter((o) => this.isVoidOrCancelled(o));
    const cancelledCount = voidOrCancelOrders.filter(
      (o) => String(o.status).toUpperCase() === 'CANCELLED',
    ).length;
    const paidVoidedCount = voidOrCancelOrders.filter(
      (o) => String(o.status).toUpperCase() === 'VOIDED',
    ).length;

    let netRevenue = 0;
    let estimatedCogs = 0;
    for (const o of paidOrders) {
      netRevenue += this.getOrderRevenue(o);
      estimatedCogs += this.computeOrderCogs(o, recipeCostMap);
    }

    const totalOrders = paidOrders.length;
    const aov = totalOrders > 0 ? Math.round(netRevenue / totalOrders) : 0;
    const grossProfit = netRevenue - estimatedCogs;
    const grossMarginPercent =
      netRevenue > 0 ? Number(((grossProfit / netRevenue) * 100).toFixed(1)) : 0;

    const voidedCount = voidOrCancelOrders.length;
    const voidedAmount = voidOrCancelOrders.reduce(
      (sum, o) => sum + this.getOrderRevenue(o),
      0,
    );

    // Save snapshot asynchronously into Neon reporting_db
    try {
      await this.snapshotRepository.save(
        this.snapshotRepository.create({
          branchId: query.branchId || 'ALL',
          startDate: startKey,
          endDate: endKey,
          netRevenue,
          estimatedCogs,
          grossProfit,
          totalOrders,
          voidedCount,
          voidedAmount,
        }),
      );
    } catch (err: any) {
      this.logger.warn(`Could not persist report snapshot: ${err?.message}`);
    }

    return {
      branchId: query.branchId || 'ALL',
      startDate: startKey,
      endDate: endKey,
      netRevenue,
      totalOrders,
      aov,
      estimatedCogs,
      grossProfit,
      grossMarginPercent,
      voidedCount,
      voidedAmount,
      cancelledCount,
      paidVoidedCount,
    };
  }

  // 2. GET /reports/revenue-chart
  async getRevenueChart(query: ReportFilterQuery) {
    const { startKey, endKey, isSingleDay } = this.normalizeDateRange(query);
    const [orders, recipeCostMap] = await Promise.all([
      this.fetchOrdersForQuery(query),
      this.buildRecipeCostMap(),
    ]);

    const paidOrders = orders.filter((o) => this.isPaidOrder(o));

    if (isSingleDay) {
      const buckets = new Map<
        number,
        { label: string; date: string; revenue: number; cogs: number; profit: number; orders: number }
      >();
      for (let h = 6; h <= 23; h++) {
        buckets.set(h, {
          label: `${String(h).padStart(2, '0')}:00`,
          date: `${startKey} ${String(h).padStart(2, '0')}:00`,
          revenue: 0,
          cogs: 0,
          profit: 0,
          orders: 0,
        });
      }

      for (const o of paidOrders) {
        const h = getVnHour(o.createdAt);
        const slot = Math.max(6, Math.min(23, h));
        const b = buckets.get(slot)!;
        const rev = this.getOrderRevenue(o);
        const cogs = this.computeOrderCogs(o, recipeCostMap);
        b.revenue += rev;
        b.cogs += cogs;
        b.profit += rev - cogs;
        b.orders += 1;
      }

      return {
        granularity: 'hour' as const,
        startDate: startKey,
        endDate: endKey,
        data: Array.from(buckets.values()),
      };
    }

    // Multi-day range: generate every day from startKey..endKey
    const dayBuckets = new Map<
      string,
      { label: string; date: string; revenue: number; cogs: number; profit: number; orders: number }
    >();
    const startCursor = new Date(`${startKey}T00:00:00.000Z`);
    const endCursor = new Date(`${endKey}T00:00:00.000Z`);
    for (
      let cur = new Date(startCursor);
      cur <= endCursor && dayBuckets.size < 90;
      cur.setUTCDate(cur.getUTCDate() + 1)
    ) {
      const key = cur.toISOString().slice(0, 10);
      const [, mm, dd] = key.split('-');
      dayBuckets.set(key, {
        label: `${dd}/${mm}`,
        date: key,
        revenue: 0,
        cogs: 0,
        profit: 0,
        orders: 0,
      });
    }

    for (const o of paidOrders) {
      const key = getVnDateKey(o.createdAt);
      if (!dayBuckets.has(key)) {
        const [, mm, dd] = key.split('-');
        dayBuckets.set(key, {
          label: `${dd}/${mm}`,
          date: key,
          revenue: 0,
          cogs: 0,
          profit: 0,
          orders: 0,
        });
      }
      const b = dayBuckets.get(key)!;
      const rev = this.getOrderRevenue(o);
      const cogs = this.computeOrderCogs(o, recipeCostMap);
      b.revenue += rev;
      b.cogs += cogs;
      b.profit += rev - cogs;
      b.orders += 1;
    }

    const sorted = Array.from(dayBuckets.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    return {
      granularity: 'day' as const,
      startDate: startKey,
      endDate: endKey,
      data: sorted,
    };
  }

  // 3. GET /reports/payment-methods
  async getPaymentMethods(query: ReportFilterQuery) {
    const orders = await this.fetchOrdersForQuery(query);
    const paidOrders = orders.filter((o) => this.isPaidOrder(o));

    const map = new Map<string, { method: string; label: string; count: number; amount: number }>();
    let grandTotal = 0;

    for (const o of paidOrders) {
      const rawMethod = o.paymentMethod || o.payment?.paymentMethod || 'CASH';
      const method = normalizePaymentMethod(rawMethod);
      const amount = this.getOrderRevenue(o);
      grandTotal += amount;

      const cur = map.get(method) || {
        method,
        label: PAYMENT_METHOD_LABELS[method] || method,
        count: 0,
        amount: 0,
      };
      cur.count += 1;
      cur.amount += amount;
      map.set(method, cur);
    }

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        percentage: grandTotal > 0 ? Number(((item.amount / grandTotal) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  // 4. GET /reports/top-products
  async getTopProducts(query: ReportFilterQuery) {
    const [orders, recipeCostMap] = await Promise.all([
      this.fetchOrdersForQuery(query),
      this.buildRecipeCostMap(),
    ]);
    const paidOrders = orders.filter((o) => this.isPaidOrder(o));

    const prodMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        quantity: number;
        revenue: number;
        estimatedCogs: number;
        profit: number;
      }
    >();

    for (const o of paidOrders) {
      const items = Array.isArray(o.items) ? o.items : [];
      for (const item of items) {
        const pid = String(item.productId || item.productName || 'unknown');
        const qty = Number(item.quantity || 1);
        const toppingsSum = (Array.isArray(item.toppings) ? item.toppings : []).reduce(
          (tSum: number, t: any) => tSum + Number(t.price || 0) * Number(t.quantity || 1),
          0,
        );
        const itemRev = Math.round((Number(item.unitPrice || 0) + toppingsSum) * qty);
        const sz = String(item.size || 'M').toUpperCase();
        const unitCogs =
          recipeCostMap.get(`${pid}_${sz}`) ??
          recipeCostMap.get(`${pid}_M`) ??
          recipeCostMap.get(`${pid}_S`) ??
          0;
        const itemCogs = Math.round(unitCogs * qty);

        const cur = prodMap.get(pid) || {
          productId: pid,
          productName: item.productName || `Món #${pid}`,
          quantity: 0,
          revenue: 0,
          estimatedCogs: 0,
          profit: 0,
        };
        cur.quantity += qty;
        cur.revenue += itemRev;
        cur.estimatedCogs += itemCogs;
        cur.profit += itemRev - itemCogs;
        prodMap.set(pid, cur);
      }
    }

    return Array.from(prodMap.values())
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
      .slice(0, 10);
  }

  // 5. GET /reports/peak-hours
  async getPeakHours(query: ReportFilterQuery) {
    const orders = await this.fetchOrdersForQuery(query);
    const paidOrders = orders.filter((o) => this.isPaidOrder(o));

    const hours: Array<{ hour: number; label: string; orders: number; revenue: number }> = [];
    for (let h = 6; h <= 23; h++) {
      hours.push({
        hour: h,
        label: `${String(h).padStart(2, '0')}h-${String(h + 1).padStart(2, '0')}h`,
        orders: 0,
        revenue: 0,
      });
    }

    for (const o of paidOrders) {
      const h = getVnHour(o.createdAt);
      if (h >= 6 && h <= 23) {
        const entry = hours[h - 6];
        entry.orders += 1;
        entry.revenue += this.getOrderRevenue(o);
      }
    }

    return hours;
  }

  // 6. GET /reports/branches-comparison
  async getBranchesComparison(query: ReportFilterQuery) {
    const [branches, orders, recipeCostMap] = await Promise.all([
      this.fetchBranches(),
      this.fetchOrdersForQuery({ ...query, branchId: 'ALL' }),
      this.buildRecipeCostMap(),
    ]);

    const branchMap = new Map<
      string,
      {
        branchId: string;
        branchCode: string;
        branchName: string;
        netRevenue: number;
        totalOrders: number;
        aov: number;
        estimatedCogs: number;
        grossProfit: number;
        voidedCount: number;
        voidedAmount: number;
        cancelRate: number;
      }
    >();

    for (const b of branches) {
      branchMap.set(String(b.id), {
        branchId: String(b.id),
        branchCode: b.code,
        branchName: b.name,
        netRevenue: 0,
        totalOrders: 0,
        aov: 0,
        estimatedCogs: 0,
        grossProfit: 0,
        voidedCount: 0,
        voidedAmount: 0,
        cancelRate: 0,
      });
    }

    for (const o of orders) {
      const bId = String(o.branchId || '1');
      if (!branchMap.has(bId)) {
        branchMap.set(bId, {
          branchId: bId,
          branchCode: `CN0${bId}`,
          branchName: `Chi nhánh ${bId}`,
          netRevenue: 0,
          totalOrders: 0,
          aov: 0,
          estimatedCogs: 0,
          grossProfit: 0,
          voidedCount: 0,
          voidedAmount: 0,
          cancelRate: 0,
        });
      }
      const stat = branchMap.get(bId)!;
      if (this.isPaidOrder(o)) {
        const rev = this.getOrderRevenue(o);
        const cogs = this.computeOrderCogs(o, recipeCostMap);
        stat.netRevenue += rev;
        stat.estimatedCogs += cogs;
        stat.grossProfit += rev - cogs;
        stat.totalOrders += 1;
      } else if (this.isVoidOrCancelled(o)) {
        stat.voidedCount += 1;
        stat.voidedAmount += this.getOrderRevenue(o);
      }
    }

    return Array.from(branchMap.values())
      .map((s) => {
        const totalAll = s.totalOrders + s.voidedCount;
        return {
          ...s,
          aov: s.totalOrders > 0 ? Math.round(s.netRevenue / s.totalOrders) : 0,
          cancelRate: totalAll > 0 ? Number(((s.voidedCount / totalAll) * 100).toFixed(1)) : 0,
        };
      })
      .sort((a, b) => b.netRevenue - a.netRevenue);
  }

  // 7. Export detailed orders for Excel
  async getExportOrders(query: ReportFilterQuery) {
    const [orders, branches, recipeCostMap] = await Promise.all([
      this.fetchOrdersForQuery(query),
      this.fetchBranches(),
      this.buildRecipeCostMap(),
    ]);
    const branchNameMap = new Map(branches.map((b) => [String(b.id), b.name]));

    return orders.map((o) => {
      const rev = this.getOrderRevenue(o);
      const cogs = this.isPaidOrder(o) ? this.computeOrderCogs(o, recipeCostMap) : 0;
      const itemsSummary = (Array.isArray(o.items) ? o.items : [])
        .map((i: any) => `${i.productName}${i.size ? ` (${i.size})` : ''} x${i.quantity || 1}`)
        .join(', ');
      return {
        orderId: o.orderCode ? `#${o.orderCode}` : String(o.id || '').slice(0, 8).toUpperCase(),
        branchName: branchNameMap.get(String(o.branchId || '1')) || `Chi nhánh ${o.branchId || '1'}`,
        orderType: o.orderType === 'AT_TABLE' ? `Tại bàn (${o.tableId || '-'})` : 'Mang về',
        status: o.status,
        paymentMethod: PAYMENT_METHOD_LABELS[normalizePaymentMethod(o.paymentMethod || o.payment?.paymentMethod)] || 'Tiền mặt',
        itemsSummary,
        revenue: rev,
        estimatedCogs: cogs,
        grossProfit: this.isPaidOrder(o) ? rev - cogs : 0,
        cancelReason: o.cancelReason || '',
        createdAt: o.createdAt,
      };
    });
  }
}
