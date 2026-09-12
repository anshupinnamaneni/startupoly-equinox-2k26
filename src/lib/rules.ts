export interface RuleSection {
  title: string;
  body: string;
}

export const RULES: RuleSection[] = [
  {
    title: '1. Game Setup',
    body: `Each match has 4 teams by default. Teams start at the START position on the physical board. The physical board remains the central game device. The web application serves as the digital referee and financial ledger.`,
  },
  {
    title: '2. Starting Resources',
    body: `Each team starts with:
- ₹1,000 cash
- 0 Company Value
- 0 Businesses`,
  },
  {
    title: '3. Businesses',
    body: `EdTech: Cost ₹200, Initial CV +150, Base rent ₹100
SaaS: Cost ₹300, Initial CV +180, Base rent ₹150
E-Commerce: Cost ₹300, Initial CV +180, Base rent ₹150
FinTech: Cost ₹400, Initial CV +200, Base rent ₹200
HealthTech: Cost ₹400, Initial CV +200, Base rent ₹200
AI/DeepTech: Cost ₹500, Initial CV +250, Base rent ₹250

Maximum 3 businesses per team.`,
  },
  {
    title: '4. Buying Businesses',
    body: `A team may buy a business when they land on an unowned business space and have sufficient cash. The cost is deducted from cash, and the initial CV is added to company value. A business is owned by the purchasing team until sold or lost through bankruptcy.`,
  },
  {
    title: '5. Rent',
    body: `When a team lands on another team's business, the landing team pays rent to the owner. Rent is based on the business's upgrade level:
- Base (Level 0): 50% of base rent
- Upgrade 1: 75% of base rent
- Upgrade 2: 100% of base rent

The owner receives the rent amount as Landing Company Value.`,
  },
  {
    title: '6. Upgrades',
    body: `Maximum 2 upgrades per business.
- Upgrade 1: ₹200, +300 CV
- Upgrade 2: ₹250, +400 CV

Upgrades increase both company value and rent multiplier.`,
  },
  {
    title: '7. Growth Bonus',
    body: `Every full lap crossing/reaching START grants +₹200 cash.
Additional business milestone bonuses:
- 2 businesses: +200 CV
- 3 businesses: +500 CV total

Multiple START crossings in a turn apply according to the official rules. Every bonus is recorded as a transaction.`,
  },
  {
    title: '8. Bonus Cards',
    body: `The movement roll determines the Bonus Card:
1 — Startup Grant: +₹300
2 — Viral Growth: +300 CV
3 — Government Incentive: +₹200 cash, +200 CV
4 — Premium Deal: Cash equal to most expensive owned business cost
5 — Founder Bonus: +₹100 per business
6 — Lucky Break: Reroll, receive ₹100 × result`,
  },
  {
    title: '9. Crisis Cards',
    body: `1 — Tax Raid: −₹300
2 — Market Crash: −300 CV
3 — Legal Trouble: −₹200 cash, −200 CV
4 — Burn Rate Spike: −₹100 cash per business
5 — Bad PR: −200 CV, −₹100 cash
6 — Investor Pullout: −₹500 cash

Penalties never reduce cash below ₹0 or CV below 0. Burn rate is ₹0 when the team owns no businesses.`,
  },
  {
    title: '10. Wildcard',
    body: `The organizer records the physical wildcard/chit task. The task is mandatory. It provides no cash advantage, no company-value advantage, and no strategic financial advantage.`,
  },
  {
    title: '11. Action Tiles',
    body: `Pitch to Investors: Mandatory. Failure/refusal loses next turn.
Lose the Feature: −200 CV.
Steal Talent: Take ₹100 from another team, or whatever cash that team currently has.

The organizer controls these actions. Teams cannot trigger financial effects themselves.`,
  },
  {
    title: '12. Dice Rules',
    body: `One die per turn. Rolling a 6 grants an extra roll. The organizer records the dice result and movement.`,
  },
  {
    title: '13. Three Consecutive Sixes',
    body: `If a team rolls three consecutive 6s in a single turn, the entire turn is cancelled. The team returns to their prior position. All rewards and effects from that turn are reversed via compensating transactions. The turn journal preserves the starting state before every turn for reversal.`,
  },
  {
    title: '14. Forced Sale / Bankruptcy',
    body: `If a team cannot pay, use cash first. If insufficient, sell businesses to the bank at original business cost. Upgrades are lost. Earned Company Value remains. Sold business returns to bank at base level. No voluntary sale when payment is affordable. If no businesses remain and the team still cannot pay, the team is marked BANKRUPT / ELIMINATED.`,
  },
  {
    title: '15. Game End',
    body: `The game ends exactly at 50 minutes. No final extra turn is allowed. At match end, the game is locked and all financial actions stop.`,
  },
  {
    title: '16. Winner and Tie-Breakers',
    body: `Winner: Highest Total Company Value.
Tie-breakers:
1. Higher cash
2. More businesses
3. 30-second pitch`,
  },
];
