export function computeHeatScore(
  deal: { stage: string; probability: number | null; stageEnteredAt: Date | null; createdAt: Date },
  contact: { lastContact: Date | null } | null
): number {
  const STAGE_WEIGHTS: Record<string, number> = {
    'call-now': 40,
    'hot-72': 38,
    'appointment': 35,
    'marketing-appt': 30,
    'promo-hot': 28,
    'active': 22,
    'appt-no-show': 18,
    'promo-cold': 12,
    'call-no-answer': 10,
  };
  const stageScore = STAGE_WEIGHTS[deal.stage] ?? 5;
  const probScore = Math.round((deal.probability ?? 50) / 100 * 30);
  const daysSinceContact = contact?.lastContact
    ? Math.floor((Date.now() - new Date(contact.lastContact).getTime()) / 86400000)
    : 999;
  const recencyScore =
    daysSinceContact === 0 ? 20
    : daysSinceContact <= 2 ? 18
    : daysSinceContact <= 5 ? 15
    : daysSinceContact <= 10 ? 10
    : daysSinceContact <= 20 ? 5
    : 0;
  const stageRef = deal.stageEnteredAt ?? deal.createdAt;
  const daysInStage = Math.floor((Date.now() - new Date(stageRef).getTime()) / 86400000);
  const stageTimeScore =
    daysInStage <= 1 ? 10
    : daysInStage <= 3 ? 8
    : daysInStage <= 7 ? 6
    : daysInStage <= 14 ? 3
    : 0;
  return Math.min(100, Math.max(0, stageScore + probScore + recencyScore + stageTimeScore));
}
