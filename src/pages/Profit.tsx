import React, { useEffect, useMemo, useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useWorkspace } from '../context/WorkspaceContext';
import MetricCard from '../components/MetricCard';
import { Calculator, DollarSign, Target, Percent, TrendingUp, AlertTriangle, CheckCircle2, Package, BriefcaseBusiness, ShoppingCart, RotateCcw, Save, BadgeDollarSign, Goal } from 'lucide-react';
import { getMetaSyncRangeLabel, getStoredMetaSyncRange, isAggregateMetaSyncRange } from '../utils/metaSyncRange';

type CalculatorMode = 'product' | 'service' | 'ecommerce';

type CalculatorState = {
  mode: CalculatorMode;
  targetCpp: number;
  price: number;
  targetProfitPerSale: number;
  marginPercent: number;
  targetProfit: number;
  closingRate: number;
  targetCustomers: number;
};

type BookingMixItem = {
  id: string;
  label: string;
  price: number;
  mix: number;
};

type WorkbookModeState = {
  budgetDaily: number;
  campaignDays: number;
  cpm: number;
  ctr: number;
  clickToLeadRate: number;
  closingRate: number;
  purchaseRate: number;
  opsCostPerBooking: number;
  targetProfit: number;
  bookingMix: BookingMixItem[];
};

const DEFAULT_CALCULATOR_STATE: Record<CalculatorMode, CalculatorState> = {
  product: {
    mode: 'product',
    targetCpp: 50,
    price: 120,
    targetProfitPerSale: 22,
    marginPercent: 60,
    targetProfit: 10000,
    closingRate: 20,
    targetCustomers: 455,
  },
  service: {
    mode: 'service',
    targetCpp: 150,
    price: 0,
    targetProfitPerSale: 0,
    marginPercent: 0,
    targetProfit: 0,
    closingRate: 10,
    targetCustomers: 5,
  },
  ecommerce: {
    mode: 'ecommerce',
    targetCpp: 30,
    price: 99,
    targetProfitPerSale: 39.3,
    marginPercent: 70,
    targetProfit: 40000,
    closingRate: 0,
    targetCustomers: 1018,
  },
};

const buildStorageKey = (workspaceId?: string | null) => `ads-intel-profit-calculator:${workspaceId || 'demo'}`;
const buildWorkbookStorageKey = (workspaceId?: string | null) => `ads-intel-profit-workbook:${workspaceId || 'demo'}`;

const DEFAULT_WORKBOOK_STATE: Record<CalculatorMode, WorkbookModeState> = {
  product: {
    budgetDaily: 30,
    campaignDays: 30,
    cpm: 10,
    ctr: 0.015,
    clickToLeadRate: 0.18,
    closingRate: 0.1,
    purchaseRate: 0,
    opsCostPerBooking: 0,
    targetProfit: 10000,
    bookingMix: [],
  },
  service: {
    budgetDaily: 30,
    campaignDays: 30,
    cpm: 12,
    ctr: 0.012,
    clickToLeadRate: 0.15,
    closingRate: 0.05,
    purchaseRate: 0,
    opsCostPerBooking: 400,
    targetProfit: 10000,
    bookingMix: [
      { id: 'weekday_1n', label: 'Weekday 1 night', price: 1500, mix: 0.3 },
      { id: 'thu_fri_1n', label: 'Thu/Fri 1 night', price: 1900, mix: 0.1 },
      { id: 'weekend_1n', label: 'Weekend 1 night', price: 2200, mix: 0.2 },
      { id: 'weekend_2n', label: 'Weekend 2 nights', price: 3800, mix: 0.25 },
      { id: 'weekend_3n', label: 'Weekend 3 nights', price: 5400, mix: 0.15 },
    ],
  },
  ecommerce: {
    budgetDaily: 30,
    campaignDays: 30,
    cpm: 10,
    ctr: 0.015,
    clickToLeadRate: 0,
    closingRate: 0,
    purchaseRate: 0.02,
    opsCostPerBooking: 0,
    targetProfit: 4000,
    bookingMix: [],
  },
};

const roundTo = (value: number, decimals = 2) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Number(value.toFixed(decimals));
};

const clampNonNegative = (value: number) => (Number.isFinite(value) && value >= 0 ? value : 0);

const calculateChange = (current: number, previous: number) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
};

const formatTrendLabel = (value: number) => {
  const rounded = Math.abs(value) >= 10 ? value.toFixed(1) : value.toFixed(2);
  const sign = value > 0 ? '+' : '';
  return `${sign}${rounded}% vs previous sync`;
};

function NumberInput({
  label,
  icon: Icon,
  value,
  suffix,
  prefix,
  onChange,
}: {
  label: string;
  icon: React.ElementType;
  value: number;
  suffix?: string;
  prefix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
        <Icon size={14} className="text-primary" />
        {label}
      </label>
      <div className="relative">
        {prefix && <span className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">{prefix}</span>}
        {suffix && <span className="absolute right-5 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">{suffix}</span>}
        <input
          type="number"
          value={value}
          min={0}
          step="0.01"
          onChange={(event) => onChange(clampNonNegative(Number(event.target.value)))}
          className={`w-full rounded-2xl border-2 border-outline-variant/20 bg-surface-container-low py-4 text-xl font-black text-on-surface outline-none transition-all focus:border-primary ${prefix ? 'pl-12 pr-5' : 'px-5'} ${suffix ? 'pr-12' : ''}`}
        />
      </div>
    </div>
  );
}

function OutputCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[1.75rem] border border-outline-variant/20 bg-surface-container-low px-5 py-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant">{label}</p>
      <p className="mt-3 text-2xl font-black text-on-surface">{value}</p>
      {hint ? <p className="mt-2 text-xs font-medium text-on-surface-variant">{hint}</p> : null}
    </div>
  );
}

function WorkbookInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = '0.01',
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant">{label}</label>
      <div className="relative">
        {prefix ? <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">{prefix}</span> : null}
        {suffix ? <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">{suffix}</span> : null}
        <input
          type="number"
          min={0}
          step={step}
          value={value}
          onChange={(event) => onChange(clampNonNegative(Number(event.target.value)))}
          className={`w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm font-bold text-on-surface outline-none transition focus:border-primary ${prefix ? 'pl-10' : ''} ${suffix ? 'pr-10' : ''}`}
        />
      </div>
    </div>
  );
}

export default function ProfitPage() {
  const { currentWorkspace } = useWorkspace();
  const { adsData, profitData, setProfitData, formatCurrency, needsFirstSync, workspaceSummary, workspaceSummaryHistory } = useDatabase();
  const currencySymbol = formatCurrency(0).replace(/[0-9,\s.]/g, '');
  const activeMetaSyncRange = getStoredMetaSyncRange(currentWorkspace?.id);
  const activeMetaSyncRangeLabel = getMetaSyncRangeLabel(activeMetaSyncRange);
  const prefersSnapshotMetrics = isAggregateMetaSyncRange(activeMetaSyncRange) || !workspaceSummary;
  const [calculatorState, setCalculatorState] = useState<Record<CalculatorMode, CalculatorState>>(() => ({
    product: {
      ...DEFAULT_CALCULATOR_STATE.product,
      price: profitData.product_price,
      targetProfitPerSale: profitData.cost || DEFAULT_CALCULATOR_STATE.product.targetProfitPerSale,
      closingRate: profitData.closing_rate * 100,
      targetCpp: profitData.CPL,
      marginPercent: profitData.cogs ? roundTo((profitData.cogs / profitData.product_price) * 100) : DEFAULT_CALCULATOR_STATE.product.marginPercent,
      targetProfit: profitData.operational_costs ? profitData.operational_costs * 4 : DEFAULT_CALCULATOR_STATE.product.targetProfit,
    },
    service: DEFAULT_CALCULATOR_STATE.service,
    ecommerce: DEFAULT_CALCULATOR_STATE.ecommerce,
  }));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(buildStorageKey(currentWorkspace?.id));
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Partial<Record<CalculatorMode, Partial<CalculatorState>>>;
      setCalculatorState((previous) => ({
        product: { ...previous.product, ...parsed.product },
        service: { ...previous.service, ...parsed.service },
        ecommerce: { ...previous.ecommerce, ...parsed.ecommerce },
      }));
    } catch {
      // Ignore malformed browser data and keep defaults.
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    localStorage.setItem(buildStorageKey(currentWorkspace?.id), JSON.stringify(calculatorState));
  }, [calculatorState, currentWorkspace?.id]);

  const activeCalculator = calculatorState.product.mode === 'product' || calculatorState.service.mode === 'service' || calculatorState.ecommerce.mode === 'ecommerce'
    ? calculatorState
    : { ...DEFAULT_CALCULATOR_STATE };

  const [activeMode, setActiveMode] = useState<CalculatorMode>('product');
  const [workbookState, setWorkbookState] = useState<Record<CalculatorMode, WorkbookModeState>>(DEFAULT_WORKBOOK_STATE);
  const currentValues = activeCalculator[activeMode];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(buildWorkbookStorageKey(currentWorkspace?.id));
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Partial<Record<CalculatorMode, Partial<WorkbookModeState>>>;
      setWorkbookState((previous) => ({
        product: { ...previous.product, ...parsed.product },
        service: {
          ...previous.service,
          ...parsed.service,
          bookingMix: Array.isArray(parsed.service?.bookingMix) ? parsed.service!.bookingMix as BookingMixItem[] : previous.service.bookingMix,
        },
        ecommerce: { ...previous.ecommerce, ...parsed.ecommerce },
      }));
    } catch {
      // Ignore malformed workbook state in local storage.
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    localStorage.setItem(buildWorkbookStorageKey(currentWorkspace?.id), JSON.stringify(workbookState));
  }, [currentWorkspace?.id, workbookState]);

  useEffect(() => {
    const nextProduct = calculatorState.product;
    setProfitData((previous) => ({
      ...previous,
      product_price: nextProduct.price,
      cost: nextProduct.targetProfitPerSale,
      closing_rate: nextProduct.closingRate / 100,
      CPL: nextProduct.targetCpp,
      cogs: roundTo(nextProduct.price * (nextProduct.marginPercent / 100)),
      operational_costs: nextProduct.targetProfit,
    }));
  }, [calculatorState.product, setProfitData]);

  const updateModeValues = (mode: CalculatorMode, updates: Partial<CalculatorState>) => {
    setCalculatorState((previous) => ({
      ...previous,
      [mode]: {
        ...previous[mode],
        ...updates,
      },
    }));
  };

  const updateWorkbookMode = (mode: CalculatorMode, updates: Partial<WorkbookModeState>) => {
    setWorkbookState((previous) => ({
      ...previous,
      [mode]: {
        ...previous[mode],
        ...updates,
      },
    }));
  };

  const updateServiceBookingMix = (id: string, updates: Partial<BookingMixItem>) => {
    setWorkbookState((previous) => ({
      ...previous,
      service: {
        ...previous.service,
        bookingMix: previous.service.bookingMix.map((item) => (
          item.id === id ? { ...item, ...updates } : item
        )),
      },
    }));
  };

  const resetActiveMode = () => {
    updateModeValues(activeMode, DEFAULT_CALCULATOR_STATE[activeMode]);
  };

  const baseMarginAmount = useMemo(() => roundTo(currentValues.price * (currentValues.marginPercent / 100)), [currentValues.marginPercent, currentValues.price]);
  const customersFromProfit = useMemo(() => {
    if (activeMode === 'service') {
      return Math.ceil(currentValues.targetCustomers);
    }
    if (currentValues.targetProfitPerSale <= 0) {
      return 0;
    }
    return Math.ceil(currentValues.targetProfit / currentValues.targetProfitPerSale);
  }, [activeMode, currentValues.targetCustomers, currentValues.targetProfit, currentValues.targetProfitPerSale]);
  const salesTargetRevenue = useMemo(() => roundTo(customersFromProfit * currentValues.price), [customersFromProfit, currentValues.price]);
  const leadsNeeded = useMemo(() => {
    if (activeMode === 'ecommerce' || currentValues.closingRate <= 0) {
      return 0;
    }
    return Math.ceil(customersFromProfit / (currentValues.closingRate / 100));
  }, [activeMode, currentValues.closingRate, customersFromProfit]);
  const maxCpl = useMemo(() => {
    if (activeMode === 'ecommerce') {
      return 0;
    }
    return roundTo(currentValues.targetCpp * (currentValues.closingRate / 100));
  }, [activeMode, currentValues.closingRate, currentValues.targetCpp]);
  const targetCplLow = useMemo(() => roundTo(maxCpl / 2), [maxCpl]);
  const targetAdSpend = useMemo(() => roundTo(customersFromProfit * currentValues.targetCpp), [customersFromProfit, currentValues.targetCpp]);
  const breakevenCpp = useMemo(() => roundTo(baseMarginAmount), [baseMarginAmount]);
  const breakevenAdSpend = useMemo(() => roundTo(customersFromProfit * breakevenCpp), [customersFromProfit, breakevenCpp]);
  const targetRoas = useMemo(() => {
    if (activeMode !== 'ecommerce' || currentValues.targetCpp <= 0) {
      return 0;
    }
    return roundTo(currentValues.price / currentValues.targetCpp);
  }, [activeMode, currentValues.price, currentValues.targetCpp]);
  const breakevenRoas = useMemo(() => {
    if (activeMode !== 'ecommerce' || breakevenCpp <= 0) {
      return 0;
    }
    return roundTo(currentValues.price / breakevenCpp);
  }, [activeMode, currentValues.price, breakevenCpp]);
  const netProfitPerSale = useMemo(() => {
    if (activeMode === 'service') {
      return roundTo(maxCpl);
    }
    return roundTo(currentValues.targetProfitPerSale);
  }, [activeMode, currentValues.targetProfitPerSale, maxCpl]);
  const costPerSale = useMemo(() => {
    if (activeMode === 'ecommerce') {
      return roundTo(currentValues.targetCpp);
    }
    if (currentValues.closingRate <= 0) {
      return 0;
    }
    return roundTo(maxCpl > 0 ? currentValues.targetCpp : currentValues.targetCpp / (currentValues.closingRate / 100));
  }, [activeMode, currentValues.closingRate, currentValues.targetCpp, maxCpl]);
  const unitMargin = useMemo(() => {
    if (activeMode === 'service') {
      return 0;
    }
    if (currentValues.price <= 0) {
      return 0;
    }
    return roundTo((netProfitPerSale / currentValues.price) * 100, 1);
  }, [activeMode, currentValues.price, netProfitPerSale]);

  const snapshotRevenue = useMemo(() => adsData.reduce((acc, curr) => acc + curr.revenue, 0), [adsData]);
  const snapshotSpend = useMemo(() => adsData.reduce((acc, curr) => acc + curr.spend, 0), [adsData]);
  const totalRevenue = prefersSnapshotMetrics ? snapshotRevenue : (workspaceSummary?.total_revenue ?? snapshotRevenue);
  const totalAdSpend = prefersSnapshotMetrics ? snapshotSpend : (workspaceSummary?.total_spend ?? snapshotSpend);
  const totalNetProfit = totalRevenue - totalAdSpend;
  const overallMargin = prefersSnapshotMetrics
    ? (totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0)
    : workspaceSummary?.profit_margin ?? (totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0);

  const kpiTrends = useMemo(() => {
    const [currentSummary, previousSummary] = workspaceSummaryHistory;
    if (!currentSummary || !previousSummary) {
      return {
        revenue: 0,
        spend: 0,
        netProfit: 0,
        margin: 0,
      };
    }

    const previousNetProfit = Number(previousSummary.total_revenue || 0) - Number(previousSummary.total_spend || 0);
    const currentNetProfit = Number(currentSummary.total_revenue || 0) - Number(currentSummary.total_spend || 0);

    return {
      revenue: calculateChange(Number(currentSummary.total_revenue || 0), Number(previousSummary.total_revenue || 0)),
      spend: calculateChange(Number(currentSummary.total_spend || 0), Number(previousSummary.total_spend || 0)),
      netProfit: calculateChange(currentNetProfit, previousNetProfit),
      margin: Number(currentSummary.profit_margin || 0) - Number(previousSummary.profit_margin || 0),
    };
  }, [workspaceSummaryHistory]);

  const healthState = useMemo(() => {
    if (activeMode === 'ecommerce') {
      if (targetRoas <= 0 || breakevenRoas <= 0) {
        return {
          tone: 'neutral',
          icon: CheckCircle2,
          text: 'Complete the calculator inputs to unlock ecommerce recommendations.',
        };
      }
      if (targetRoas < breakevenRoas) {
        return {
          tone: 'danger',
          icon: AlertTriangle,
          text: 'Your target ROAS is below breakeven. Reduce CPP or improve average order economics first.',
        };
      }
      if (targetRoas >= breakevenRoas * 1.6) {
        return {
          tone: 'success',
          icon: TrendingUp,
          text: 'Your ecommerce target ROAS leaves healthy room to scale.',
        };
      }
      return {
        tone: 'neutral',
        icon: CheckCircle2,
        text: 'This setup is workable, but monitor ROAS closely before increasing spend.',
      };
    }

    if (maxCpl <= 0) {
      return {
        tone: 'neutral',
        icon: CheckCircle2,
        text: 'Complete the calculator inputs to unlock lead cost guidance.',
      };
    }
    if (targetCplLow === 0) {
      return {
        tone: 'neutral',
        icon: CheckCircle2,
        text: 'Set a valid closing rate to calculate your target CPL window.',
      };
    }
    if (maxCpl < currentValues.targetCpp * 0.25) {
      return {
        tone: 'danger',
        icon: AlertTriangle,
        text: 'This target is very tight. You may need a better close rate or a higher customer value.',
      };
    }
    if (unitMargin > 30 || activeMode === 'service') {
      return {
        tone: 'success',
        icon: TrendingUp,
        text: 'Your campaign model looks profitable and scalable at the current assumptions.',
      };
    }
    return {
      tone: 'neutral',
      icon: CheckCircle2,
      text: 'Profitable, but keep optimizing conversion rate and lead quality before scaling hard.',
    };
  }, [activeMode, currentValues.targetCpp, maxCpl, targetCplLow, unitMargin, targetRoas, breakevenRoas]);

  const insightCopy = useMemo(() => {
    if (activeMode === 'service') {
      return `To land ${customersFromProfit} customers at a ${currentValues.closingRate.toFixed(1)}% closing rate, you need about ${leadsNeeded} WhatsApp leads and ${formatCurrency(targetAdSpend)} in ad spend.`;
    }
    if (activeMode === 'ecommerce') {
      return targetRoas >= breakevenRoas && targetRoas > 0
        ? `Your target ROAS is ${targetRoas.toFixed(2)}x against a breakeven of ${breakevenRoas.toFixed(2)}x, which gives you room to scale once the campaign stabilizes.`
        : 'Raise margin, average order value, or conversion rate before pushing more ecommerce spend.';
    }
    return `To reach ${formatCurrency(currentValues.targetProfit)} profit, you need ${customersFromProfit} customers, around ${leadsNeeded} WhatsApp leads, and a CPL range of ${formatCurrency(targetCplLow)} to ${formatCurrency(maxCpl)}.`;
  }, [activeMode, breakevenRoas, currentValues.closingRate, currentValues.targetProfit, customersFromProfit, formatCurrency, leadsNeeded, maxCpl, targetAdSpend, targetCplLow, targetRoas]);

  const HealthIcon = healthState.icon;
  const workbookValues = workbookState[activeMode];

  const workbookMetrics = useMemo(() => {
    const impressionsDay = workbookValues.cpm > 0 ? (workbookValues.budgetDaily / workbookValues.cpm) * 1000 : 0;
    const clicksDay = impressionsDay * workbookValues.ctr;
    const avgBookingValue = activeMode === 'service'
      ? workbookValues.bookingMix.reduce((sum, item) => sum + item.price * item.mix, 0)
      : currentValues.price;
    const marginAmount = activeMode === 'service'
      ? Math.max(avgBookingValue - workbookValues.opsCostPerBooking, 0)
      : currentValues.price * (currentValues.marginPercent / 100);

    if (activeMode === 'ecommerce') {
      const ordersDay = clicksDay * workbookValues.purchaseRate;
      const cpa = ordersDay > 0 ? workbookValues.budgetDaily / ordersDay : 0;
      const netProfitPerOrder = marginAmount - cpa;
      const ordersMonth = ordersDay * workbookValues.campaignDays;
      const revenueMonth = ordersMonth * currentValues.price;
      const adSpendMonth = workbookValues.budgetDaily * workbookValues.campaignDays;
      const roas = adSpendMonth > 0 ? revenueMonth / adSpendMonth : 0;
      const breakEvenRoas = currentValues.marginPercent > 0 ? 1 / (currentValues.marginPercent / 100) : 0;
      const requiredOrdersMonth = netProfitPerOrder > 0 ? workbookValues.targetProfit / netProfitPerOrder : 0;
      const requiredClicksMonth = workbookValues.purchaseRate > 0 ? requiredOrdersMonth / workbookValues.purchaseRate : 0;
      const requiredImpressionsMonth = workbookValues.ctr > 0 ? requiredClicksMonth / workbookValues.ctr : 0;
      const requiredMonthlyAdSpend = (requiredImpressionsMonth / 1000) * workbookValues.cpm;
      const requiredDailyBudget = workbookValues.campaignDays > 0 ? requiredMonthlyAdSpend / workbookValues.campaignDays : 0;

      return {
        avgBookingValue,
        impressionsDay,
        clicksDay,
        conversionsDay: ordersDay,
        conversionsMonth: ordersMonth,
        cpa,
        cpl: 0,
        netProfitPerConversion: netProfitPerOrder,
        revenueMonth,
        adSpendMonth,
        requiredMonthlyConversions: requiredOrdersMonth,
        requiredMonthlyLeads: 0,
        requiredDailyBudget,
        roas,
        breakEvenRoas,
        mixTotal: 0,
      };
    }

    const leadsDayWorkbook = clicksDay * workbookValues.clickToLeadRate;
    const salesDay = leadsDayWorkbook * workbookValues.closingRate;
    const cpl = leadsDayWorkbook > 0 ? workbookValues.budgetDaily / leadsDayWorkbook : 0;
    const cpa = salesDay > 0 ? workbookValues.budgetDaily / salesDay : 0;
    const netProfitPerConversion = activeMode === 'service'
      ? avgBookingValue - workbookValues.opsCostPerBooking - cpa
      : marginAmount - cpa;
    const conversionsMonth = salesDay * workbookValues.campaignDays;
    const revenueMonth = conversionsMonth * avgBookingValue;
    const adSpendMonth = workbookValues.budgetDaily * workbookValues.campaignDays;
    const requiredMonthlyConversions = netProfitPerConversion > 0 ? workbookValues.targetProfit / netProfitPerConversion : 0;
    const requiredMonthlyLeads = workbookValues.closingRate > 0 ? requiredMonthlyConversions / workbookValues.closingRate : 0;
    const requiredClicksMonth = workbookValues.clickToLeadRate > 0 ? requiredMonthlyLeads / workbookValues.clickToLeadRate : 0;
    const requiredImpressionsMonth = workbookValues.ctr > 0 ? requiredClicksMonth / workbookValues.ctr : 0;
    const requiredMonthlyAdSpend = (requiredImpressionsMonth / 1000) * workbookValues.cpm;
    const requiredDailyBudget = workbookValues.campaignDays > 0 ? requiredMonthlyAdSpend / workbookValues.campaignDays : 0;

    return {
      avgBookingValue,
      impressionsDay,
      clicksDay,
      conversionsDay: salesDay,
      conversionsMonth,
      cpa,
      cpl,
      netProfitPerConversion,
      revenueMonth,
      adSpendMonth,
      requiredMonthlyConversions,
      requiredMonthlyLeads,
      requiredDailyBudget,
      roas: 0,
      breakEvenRoas: 0,
      mixTotal: workbookValues.bookingMix.reduce((sum, item) => sum + item.mix, 0),
    };
  }, [activeMode, currentValues.marginPercent, currentValues.price, workbookValues]);

  const workbookInsight = useMemo(() => {
    if (activeMode === 'service') {
      if (Math.abs(workbookMetrics.mixTotal - 1) > 0.001) {
        return 'The villa booking mix should total 100% so the weighted booking value stays accurate.';
      }
      return workbookMetrics.netProfitPerConversion > 0
        ? `At the current villa assumptions, the model needs about ${formatCurrency(workbookMetrics.requiredDailyBudget)} per day to target ${formatCurrency(workbookValues.targetProfit)} monthly profit.`
        : 'The current villa assumptions produce negative profit per booking after ad cost, so raise price, improve close rate, or lower CPM.';
    }

    if (activeMode === 'ecommerce') {
      return workbookMetrics.netProfitPerConversion > 0
        ? `The workbook ROAS model is sitting at ${workbookMetrics.roas.toFixed(2)}x against a break-even of ${workbookMetrics.breakEvenRoas.toFixed(2)}x.`
        : 'The current ecommerce assumptions are below break-even after ad cost, so improve purchase rate, margin, or CPA first.';
    }

    return workbookMetrics.netProfitPerConversion > 0
      ? `With these product funnel assumptions, you need about ${formatCurrency(workbookMetrics.requiredDailyBudget)} per day to chase ${formatCurrency(workbookValues.targetProfit)} monthly profit.`
      : 'The product workbook assumptions are not profitable yet after CPA, so tighten funnel efficiency or increase margin.';
  }, [activeMode, formatCurrency, workbookMetrics, workbookValues.targetProfit]);

  return (
    <main className="mx-auto max-w-[1360px] px-6 pb-32 lg:px-8">
      <div className="mb-12">
        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-secondary">Profit Intelligence</p>
        <h1 className="font-headline text-[3.6rem] font-extrabold leading-tight tracking-[-0.05em] text-on-surface">Profit Analysis</h1>
        <p className="mt-3 text-sm font-medium text-on-surface-variant">Live business reporting plus calculator modes based on your Meta Ads metrics workbook.</p>
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">Active Meta sync window: {activeMetaSyncRangeLabel}</p>
      </div>

      <div className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Revenue" value={formatCurrency(totalRevenue)} trend={kpiTrends.revenue} trendLabel={formatTrendLabel(kpiTrends.revenue)} />
        <MetricCard label="Total Ad Spend" value={formatCurrency(totalAdSpend)} trend={kpiTrends.spend} trendLabel={formatTrendLabel(kpiTrends.spend)} />
        <MetricCard label="Net Profit" value={formatCurrency(totalNetProfit)} trend={kpiTrends.netProfit} trendLabel={formatTrendLabel(kpiTrends.netProfit)} isPrimary={true} />
        <MetricCard label="Profit Margin" value={`${overallMargin.toFixed(1)}%`} trend={kpiTrends.margin} trendLabel={formatTrendLabel(kpiTrends.margin)} />
      </div>

      {prefersSnapshotMetrics && (
        <div className="mb-12 rounded-[1.5rem] border border-outline-variant/25 bg-surface-container-low px-5 py-4 text-sm text-on-surface-variant">
          Profit KPIs are following the latest synced Meta snapshot for <span className="font-bold text-on-surface">{activeMetaSyncRangeLabel}</span>, so the totals match your broader campaign window instead of only the latest daily summary.
        </div>
      )}

      {needsFirstSync && (
        <div className="mb-12 rounded-[2rem] border border-dashed border-outline-variant/30 bg-surface-container-low p-8">
          <p className="text-lg font-bold text-on-surface">Profit reporting will become live after the first sync</p>
          <p className="mt-2 text-sm text-on-surface-variant">The calculator is already usable, but the top KPI cards need synced campaign snapshots before they reflect real workspace performance.</p>
        </div>
      )}

      <section className="panel-surface mb-12 rounded-[2rem] p-8 lg:p-10">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Calculator size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black font-headline text-on-surface uppercase tracking-tight">Workbook Profit Calculator</h3>
              <p className="text-xs text-on-surface-variant font-medium">Three calculator modes mirrored from your Excel workbook: product, service, and ecommerce.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={resetActiveMode} className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 px-4 py-2 text-sm font-bold text-on-surface">
              <RotateCcw size={16} />
              Reset Mode
            </button>
            <button onClick={() => localStorage.setItem(buildStorageKey(currentWorkspace?.id), JSON.stringify(calculatorState))} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white">
              <Save size={16} />
              Save Inputs
            </button>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-3">
          {[
            { id: 'product' as const, label: 'Whatsapp Product', icon: Package },
            { id: 'service' as const, label: 'Whatsapp Service', icon: BriefcaseBusiness },
            { id: 'ecommerce' as const, label: 'Ecommerce', icon: ShoppingCart },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveMode(id)}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all ${activeMode === id ? 'bg-primary text-white shadow-lg shadow-black/15' : 'border border-outline-variant/30 text-on-surface hover:bg-surface-container-high'}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-10 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-8">
            <div className={`grid gap-6 ${activeMode === 'service' ? 'md:grid-cols-3' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
              <NumberInput label={activeMode === 'ecommerce' ? 'Target CPP' : 'Target Cost per Purchase'} icon={BadgeDollarSign} prefix={currencySymbol} value={currentValues.targetCpp} onChange={(value) => updateModeValues(activeMode, { targetCpp: value })} />

              {activeMode !== 'service' && (
                <NumberInput label="Product Price" icon={DollarSign} prefix={currencySymbol} value={currentValues.price} onChange={(value) => updateModeValues(activeMode, { price: value })} />
              )}

              {activeMode !== 'service' && (
                <NumberInput label="Target Profit per Sale" icon={Target} prefix={currencySymbol} value={currentValues.targetProfitPerSale} onChange={(value) => updateModeValues(activeMode, { targetProfitPerSale: value })} />
              )}

              {activeMode !== 'ecommerce' && (
                <NumberInput label="Closing Rate" icon={Percent} suffix="%" value={currentValues.closingRate} onChange={(value) => updateModeValues(activeMode, { closingRate: value })} />
              )}

              {activeMode !== 'service' && (
                <NumberInput label="Margin Percentage" icon={Percent} suffix="%" value={currentValues.marginPercent} onChange={(value) => updateModeValues(activeMode, { marginPercent: value })} />
              )}

              {activeMode === 'service' ? (
                <NumberInput label="Target Customers" icon={Goal} value={currentValues.targetCustomers} onChange={(value) => updateModeValues(activeMode, { targetCustomers: value })} />
              ) : (
                <NumberInput label="Target Profit" icon={Goal} prefix={currencySymbol} value={currentValues.targetProfit} onChange={(value) => updateModeValues(activeMode, { targetProfit: value })} />
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activeMode !== 'service' && <OutputCard label="Margin Amount" value={formatCurrency(baseMarginAmount)} hint="Derived from product price x margin percentage" />}
              <OutputCard label="Customers Needed" value={customersFromProfit.toLocaleString()} hint={activeMode === 'service' ? 'Direct target from workbook service mode' : 'Based on target profit divided by profit per sale'} />
              {activeMode !== 'ecommerce' && <OutputCard label="Leads Needed" value={leadsNeeded.toLocaleString()} hint="Customers needed divided by closing rate" />}
              {activeMode !== 'service' && <OutputCard label="Sales Target" value={formatCurrency(salesTargetRevenue)} hint="Projected revenue needed to hit your target" />}
              <OutputCard label="Target Ad Spend" value={formatCurrency(targetAdSpend)} hint="Customers needed multiplied by target CPP" />
              {activeMode !== 'service' && <OutputCard label="Breakeven Ad Spend" value={formatCurrency(breakevenAdSpend)} hint="Spend ceiling before margin is fully consumed" />}
              {activeMode !== 'ecommerce' && <OutputCard label="Maximum CPL" value={formatCurrency(maxCpl)} hint="Highest CPL allowed to stay within target cost per purchase" />}
              {activeMode !== 'ecommerce' && <OutputCard label="Target CPL Window" value={`${formatCurrency(targetCplLow)} - ${formatCurrency(maxCpl)}`} hint="Recommended scale-safe CPL range from the workbook" />}
              {activeMode === 'ecommerce' && <OutputCard label="Breakeven ROAS" value={`${breakevenRoas.toFixed(2)}x`} hint="Minimum ROAS needed to protect margin" />}
              {activeMode === 'ecommerce' && <OutputCard label="Target ROAS" value={`${targetRoas.toFixed(2)}x`} hint="ROAS needed to hold the target CPP" />}
              {activeMode !== 'service' && <OutputCard label="Breakeven CPP" value={formatCurrency(breakevenCpp)} hint="Maximum cost per purchase before profit becomes zero" />}
            </div>
          </div>

          <div className="rounded-3xl border border-secondary/15 bg-secondary/10 p-8">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-primary/10 pb-4">
                <span className="text-xs font-bold text-on-surface-variant">Active Mode</span>
                <span className="text-sm font-black uppercase tracking-wider text-on-surface">{activeMode}</span>
              </div>
              <div className="flex items-center justify-between border-b border-primary/10 pb-4">
                <span className="text-xs font-bold text-on-surface-variant">{activeMode === 'ecommerce' ? 'Target CPP' : 'Target Cost per Purchase'}</span>
                <span className="text-xl font-black text-on-surface">{formatCurrency(currentValues.targetCpp)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-primary/10 pb-4">
                <span className="text-xs font-bold text-on-surface-variant">{activeMode === 'ecommerce' ? 'Target ROAS' : 'Cost per Sale'}</span>
                <span className="text-xl font-black text-on-surface">{activeMode === 'ecommerce' ? `${targetRoas.toFixed(2)}x` : formatCurrency(costPerSale)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-primary/10 pb-4">
                <span className="text-xs font-bold text-on-surface-variant">{activeMode === 'service' ? 'Max CPL' : 'Net Profit per Sale'}</span>
                <span className={`text-xl font-black ${healthState.tone === 'danger' ? 'text-error' : 'text-secondary'}`}>{activeMode === 'service' ? formatCurrency(maxCpl) : formatCurrency(netProfitPerSale)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-primary/10 pb-4">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-on-surface-variant">{activeMode === 'ecommerce' ? 'Breakeven ROAS' : activeMode === 'service' ? 'Target Ad Spend' : 'Estimated Margin'}</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary/70">{activeMode === 'ecommerce' ? 'Minimum performance line' : 'Workbook driven metric'}</span>
                </div>
                <span className="text-xl font-black text-on-surface">{activeMode === 'ecommerce' ? `${breakevenRoas.toFixed(2)}x` : activeMode === 'service' ? formatCurrency(targetAdSpend) : `${unitMargin.toFixed(1)}%`}</span>
              </div>

              <div className="pt-4 flex items-start gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${healthState.tone === 'danger' ? 'bg-red-100 text-red-600' : healthState.tone === 'success' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                  <HealthIcon size={16} />
                </div>
                <p className={`text-sm font-bold leading-tight ${healthState.tone === 'danger' ? 'text-red-700' : healthState.tone === 'success' ? 'text-green-700' : 'text-blue-700'}`}>{healthState.text}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel-surface mb-12 rounded-[2rem] p-8 lg:p-10">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-secondary">Antigravity Workbook</p>
            <h3 className="mt-2 font-headline text-2xl font-black tracking-tight text-on-surface">Workbook Blueprint Layer</h3>
            <p className="mt-2 max-w-3xl text-sm text-on-surface-variant">
              Live assumptions and reverse-budget math mirrored from `Profit_Calculator_Antigravity.xlsx`, kept in a separate section so the main calculator stays clean.
            </p>
          </div>
          <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-xs font-bold text-on-surface-variant">
            Active workbook mode: <span className="ml-2 uppercase text-on-surface">{activeMode}</span>
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.2fr_1.4fr]">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <WorkbookInput label="Daily Budget" value={workbookValues.budgetDaily} prefix={currencySymbol} onChange={(value) => updateWorkbookMode(activeMode, { budgetDaily: value })} />
              <WorkbookInput label="Campaign Days" value={workbookValues.campaignDays} onChange={(value) => updateWorkbookMode(activeMode, { campaignDays: value })} />
              <WorkbookInput label="CPM" value={workbookValues.cpm} prefix={currencySymbol} onChange={(value) => updateWorkbookMode(activeMode, { cpm: value })} />
              <WorkbookInput label="CTR" value={roundTo(workbookValues.ctr * 100, 2)} suffix="%" onChange={(value) => updateWorkbookMode(activeMode, { ctr: value / 100 })} />
              {activeMode !== 'ecommerce' ? (
                <WorkbookInput label="Click to Lead" value={roundTo(workbookValues.clickToLeadRate * 100, 2)} suffix="%" onChange={(value) => updateWorkbookMode(activeMode, { clickToLeadRate: value / 100 })} />
              ) : (
                <WorkbookInput label="Purchase Rate" value={roundTo(workbookValues.purchaseRate * 100, 2)} suffix="%" onChange={(value) => updateWorkbookMode(activeMode, { purchaseRate: value / 100 })} />
              )}
              {activeMode !== 'ecommerce' ? (
                <WorkbookInput label="Closing Rate" value={roundTo(workbookValues.closingRate * 100, 2)} suffix="%" onChange={(value) => updateWorkbookMode(activeMode, { closingRate: value / 100 })} />
              ) : (
                <WorkbookInput label="Target Profit" value={workbookValues.targetProfit} prefix={currencySymbol} onChange={(value) => updateWorkbookMode(activeMode, { targetProfit: value })} />
              )}
              {activeMode === 'service' ? (
                <>
                  <WorkbookInput label="Ops Cost / Booking" value={workbookValues.opsCostPerBooking} prefix={currencySymbol} onChange={(value) => updateWorkbookMode(activeMode, { opsCostPerBooking: value })} />
                  <WorkbookInput label="Target Profit" value={workbookValues.targetProfit} prefix={currencySymbol} onChange={(value) => updateWorkbookMode(activeMode, { targetProfit: value })} />
                </>
              ) : activeMode !== 'ecommerce' ? (
                <WorkbookInput label="Target Profit" value={workbookValues.targetProfit} prefix={currencySymbol} onChange={(value) => updateWorkbookMode(activeMode, { targetProfit: value })} />
              ) : null}
            </div>

            {activeMode === 'service' && (
              <div className="rounded-[1.75rem] border border-outline-variant/20 bg-surface-container-low p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-on-surface">Villa Booking Mix</p>
                    <p className="text-xs text-on-surface-variant">Weighted booking value from the workbook&apos;s service sheet.</p>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-[11px] font-black ${Math.abs(workbookMetrics.mixTotal - 1) < 0.001 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'}`}>
                    Mix total: {(workbookMetrics.mixTotal * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="space-y-3">
                  {workbookValues.bookingMix.map((item) => (
                    <div key={item.id} className="grid gap-3 rounded-2xl border border-outline-variant/15 bg-background/30 p-4 md:grid-cols-[1.5fr_0.9fr_0.9fr]">
                      <div>
                        <p className="text-sm font-bold text-on-surface">{item.label}</p>
                      </div>
                      <WorkbookInput label="Price" value={item.price} prefix={currencySymbol} onChange={(value) => updateServiceBookingMix(item.id, { price: value })} />
                      <WorkbookInput label="Mix" value={roundTo(item.mix * 100, 2)} suffix="%" onChange={(value) => updateServiceBookingMix(item.id, { mix: value / 100 })} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-[1.75rem] border border-outline-variant/20 bg-surface-container-low p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-secondary">Workbook Insight</p>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-on-surface">{workbookInsight}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <OutputCard label={activeMode === 'service' ? 'Average Booking Value' : 'Margin Amount'} value={formatCurrency(activeMode === 'service' ? workbookMetrics.avgBookingValue : currentValues.price * (currentValues.marginPercent / 100))} hint={activeMode === 'service' ? 'Weighted from your villa booking mix' : 'Workbook net margin before ads'} />
              <OutputCard label="Impressions / Day" value={Math.round(workbookMetrics.impressionsDay).toLocaleString()} hint="(daily budget / CPM) x 1,000" />
              <OutputCard label="Clicks / Day" value={roundTo(workbookMetrics.clicksDay, 2).toLocaleString()} hint="Impressions x CTR" />
              <OutputCard label={activeMode === 'ecommerce' ? 'Orders / Day' : activeMode === 'service' ? 'Bookings / Day' : 'Sales / Day'} value={roundTo(workbookMetrics.conversionsDay, 3).toLocaleString()} hint="Mode-specific end conversion per day" />
              {activeMode !== 'ecommerce' && <OutputCard label="Leads / Day" value={roundTo(workbookMetrics.clicksDay * workbookValues.clickToLeadRate, 2).toLocaleString()} hint="Clicks x click-to-lead rate" />}
              <OutputCard label="CPA" value={formatCurrency(workbookMetrics.cpa)} hint="Daily budget divided by daily conversions" />
              {activeMode !== 'ecommerce' && <OutputCard label="CPL" value={formatCurrency(workbookMetrics.cpl)} hint="Daily budget divided by daily leads" />}
              <OutputCard label={activeMode === 'ecommerce' ? 'Net Profit / Order' : activeMode === 'service' ? 'Net Profit / Booking' : 'Net Profit / Sale'} value={formatCurrency(workbookMetrics.netProfitPerConversion)} hint="Workbook margin minus acquisition cost" />
              <OutputCard label="Revenue / Month" value={formatCurrency(workbookMetrics.revenueMonth)} hint="Projected monthly top-line at current assumptions" />
              <OutputCard label="Ad Spend / Month" value={formatCurrency(workbookMetrics.adSpendMonth)} hint="Daily budget x campaign days" />
              <OutputCard label={activeMode === 'ecommerce' ? 'Orders Needed / Month' : activeMode === 'service' ? 'Bookings Needed / Month' : 'Sales Needed / Month'} value={Math.ceil(workbookMetrics.requiredMonthlyConversions).toLocaleString()} hint="Reverse calculator from target profit" />
              {activeMode !== 'ecommerce' && <OutputCard label="Leads Needed / Month" value={Math.ceil(workbookMetrics.requiredMonthlyLeads).toLocaleString()} hint="Required conversions divided by closing rate" />}
              <OutputCard label="Required Daily Budget" value={formatCurrency(workbookMetrics.requiredDailyBudget)} hint="Monthly ad spend needed divided by campaign days" />
              {activeMode === 'ecommerce' && <OutputCard label="ROAS / Month" value={`${workbookMetrics.roas.toFixed(2)}x`} hint="Revenue divided by ad spend" />}
              {activeMode === 'ecommerce' && <OutputCard label="Break-even ROAS" value={`${workbookMetrics.breakEvenRoas.toFixed(2)}x`} hint="1 / margin percentage from the workbook" />}
            </div>

            <div className="rounded-[1.75rem] border border-outline-variant/20 bg-surface-container-low p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-secondary">Variable Map</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-outline-variant/15 bg-background/30 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-on-surface-variant">impressions_day</p>
                  <p className="mt-2 text-sm font-semibold text-on-surface">(budget_daily / cpm) * 1000</p>
                </div>
                <div className="rounded-2xl border border-outline-variant/15 bg-background/30 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-on-surface-variant">clicks_day</p>
                  <p className="mt-2 text-sm font-semibold text-on-surface">impressions_day * ctr</p>
                </div>
                <div className="rounded-2xl border border-outline-variant/15 bg-background/30 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-on-surface-variant">{activeMode === 'ecommerce' ? 'orders_day' : 'leads_day / sales_day'}</p>
                  <p className="mt-2 text-sm font-semibold text-on-surface">
                    {activeMode === 'ecommerce'
                      ? 'clicks_day * purchase_rate'
                      : 'clicks_day * click_to_lead_rate, then leads_day * closing_rate'}
                  </p>
                </div>
                <div className="rounded-2xl border border-outline-variant/15 bg-background/30 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-on-surface-variant">required_daily_budget</p>
                  <p className="mt-2 text-sm font-semibold text-on-surface">required_monthly_ad_spend / campaign_days</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={`rounded-3xl p-12 shadow-xl transition-all duration-500 ${healthState.tone === 'danger' ? 'bg-red-600 shadow-red-200' : 'dark-panel'} text-white`}>
        <div className="relative z-10 flex flex-col gap-12 md:flex-row md:items-baseline">
          <div className="flex-grow">
            <h2 className="mb-6 flex items-center gap-4 text-3xl font-black font-headline uppercase tracking-wide">
              {healthState.tone === 'danger' ? 'Profit Warning' : 'Target Unit Metrics'}
              {healthState.tone !== 'danger' && <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest">Workbook Verified</span>}
            </h2>
            <div className="flex flex-col gap-12 md:flex-row md:items-baseline">
              <div>
                <span className="mb-2 block text-sm font-black uppercase tracking-widest opacity-80">{activeMode === 'service' ? 'Maximum CPL' : 'Net Profit Per Sale'}</span>
                <span className="text-[4rem] font-black leading-none drop-shadow-md">{activeMode === 'service' ? formatCurrency(maxCpl) : formatCurrency(netProfitPerSale)}</span>
              </div>
              <div>
                <span className="mb-2 block text-sm font-black uppercase tracking-widest opacity-80">{activeMode === 'ecommerce' ? 'Target ROAS' : activeMode === 'service' ? 'Lead Volume Needed' : 'Estimated Margin'}</span>
                <span className="text-[4rem] font-black leading-none drop-shadow-md">{activeMode === 'ecommerce' ? `${targetRoas.toFixed(2)}x` : activeMode === 'service' ? leadsNeeded.toLocaleString() : `${unitMargin.toFixed(1)}%`}</span>
              </div>
            </div>
          </div>
          <div className="space-y-4 md:border-l md:border-white/20 md:pl-12">
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">Quick Insight</p>
            <p className="max-w-[340px] text-lg font-bold leading-relaxed">{insightCopy}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
