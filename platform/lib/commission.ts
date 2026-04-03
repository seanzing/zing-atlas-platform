/**
 * Commission calculation for deals.
 *
 * subscriptionCommission = deal.value × product.commissionValue  (when type = 'subscription')
 * launchFeeCommission    = deal.launchFeeAmount × product.launchFeeCommissionRate
 */
export function calcDealCommission(
  deal: {
    value: number | null;
    launchFeeAmount: number | null;
  },
  product: {
    commissionType: string | null;
    commissionValue: number | null;
    launchFeeCommissionRate: number | null;
  } | null
): { subscriptionCommission: number; launchFeeCommission: number; total: number } {
  const safeNum = (v: unknown): number => {
    const n = Number(v ?? 0);
    return isNaN(n) ? 0 : n;
  };

  const subscriptionCommission =
    product?.commissionType === "subscription"
      ? safeNum(deal.value) * safeNum(product.commissionValue)
      : 0;

  const launchFeeCommission =
    safeNum(deal.launchFeeAmount) *
    safeNum(product?.launchFeeCommissionRate);

  const total = subscriptionCommission + launchFeeCommission;

  return { subscriptionCommission, launchFeeCommission, total };
}
