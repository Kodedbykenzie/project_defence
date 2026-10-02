import type { LearningModule } from '../types/platform';

const bnr = { title: 'Financial consumer education', source: 'National Bank of Rwanda', url: 'https://www.bnr.rw' };
const oecd = { title: 'Core competencies framework on financial literacy for youth', source: 'OECD/INFE', url: 'https://www.oecd.org/financial/education/' };

export const initialModules: LearningModule[] = [
{
  id: 'm-budgeting', domain: 'budgeting', title: 'Build a student budget that lasts the month', competency: 'Monthly budgeting',
  summary: 'Track where your money goes, split it with 50/30/20 and stay on track when things get tight.',
  minutes: 12, passingScore: 67, published: true, onboarding: true,
  objectives: ['List income and expenses accurately', 'Apply the 50/30/20 guideline to your own income', 'Adjust a budget mid-month without borrowing'],
  lessons: [
  {
    title: 'Know your money in and out',
    paragraphs: [
    'A budget starts with two lists: money coming in (allowance, stipend, scholarship, part-time work) and money going out. Write down every source and when it arrives — a stipend that lands on the 5th changes how you plan the first week.',
    'Track your spending for two weeks before setting limits. Most students underestimate small, frequent costs like airtime, moto rides and snacks.'],

    example: 'Aline receives a 150,000 RWF stipend. Two weeks of tracking show 18,000 RWF a month on moto rides she hadn’t noticed.'
  },
  {
    title: 'The 50/30/20 starting point',
    paragraphs: [
    'Split income into needs (50%), wants (30%) and savings or debt repayment (20%). It is a starting point, not a rule — if rent in Kigali takes 45% alone, reduce wants first.',
    'Needs are costs you must pay to live and study: rent, food, transport to campus and data for classes.'],

    example: 'On 150,000 RWF: 75,000 needs · 45,000 wants · 30,000 savings.'
  },
  {
    title: 'Stay on track mid-month',
    paragraphs: [
    'Check your budget weekly. When a category overspends, move money from a flexible category instead of borrowing.',
    'Move savings to a separate wallet the day your stipend arrives, so you budget with what is left.'],

    example: 'Food at 70% by day 15? Move 8,000 RWF from “outings” and plan cheaper meals for the rest of the month.'
  }],

  activity: { title: 'Draft your monthly budget', prompt: 'List your monthly income and split it into needs, wants and savings using real numbers. Which category surprised you most?' },
  quiz: [
  { id: 'mb1', domain: 'budgeting', prompt: 'Which of these is a “want” rather than a “need”?', options: ['Rent', 'A streaming subscription', 'Transport to campus', 'Groceries'], answer: 1, explanation: 'Streaming is enjoyable but not essential to live or study.' },
  { id: 'mb2', domain: 'budgeting', prompt: 'Your income is 200,000 RWF. Under 50/30/20, how much goes to needs?', options: ['40,000 RWF', '60,000 RWF', '100,000 RWF', '120,000 RWF'], answer: 2, explanation: '50% of 200,000 RWF is 100,000 RWF.' },
  { id: 'mb3', domain: 'budgeting', prompt: 'Why track spending before setting limits?', options: ['Banks require it', 'It reveals small, frequent costs you would underestimate', 'It increases your income', 'It removes the need to save'], answer: 1, explanation: 'Tracking gives you real numbers to plan with.' }],

  resources: [oecd, bnr]
},
{
  id: 'm-saving', domain: 'saving', title: 'Emergency funds & saving habits', competency: 'Emergency saving',
  summary: 'Why an emergency fund comes first, how to pay yourself first, and where to keep your savings.',
  minutes: 10, passingScore: 67, published: true,
  objectives: ['Set a realistic emergency fund target', 'Automate saving when income arrives', 'Choose a safe, accessible place for savings'],
  lessons: [
  {
    title: 'Why an emergency fund comes first',
    paragraphs: [
    'An emergency fund is money set aside only for unexpected, essential costs — a medical bill, a broken laptop before exams, or a delayed stipend.',
    'Aim first for one month of essential expenses, then build toward three to six months.'],

    example: 'If essentials cost 90,000 RWF a month, a first target is 90,000 RWF; a full cushion is 270,000–540,000 RWF.'
  },
  {
    title: 'Pay yourself first',
    paragraphs: [
    'Treat saving like a bill you pay on the day money arrives, not what is left at month-end.',
    'Small amounts become a habit: 5,000 RWF a week is 260,000 RWF in a year.'],

    example: 'Set a standing order that moves 10% of your stipend into savings automatically.'
  },
  {
    title: 'Where to keep savings',
    paragraphs: [
    'Emergency money must be safe and quick to reach — a savings account, a SACCO or a mobile savings wallet. It should not be in anything that can fall in value.',
    'For long-term goals, government-backed schemes such as Ejo Heza offer long-term saving.'],

    example: 'Keep your emergency fund separate from your spending wallet so it isn’t spent by accident.'
  }],

  activity: { title: 'Set your emergency fund target', prompt: 'Estimate your essential monthly expenses, set a first emergency fund target and describe how much you will save each week to reach it.' },
  quiz: [
  { id: 'ms1', domain: 'saving', prompt: 'What should an emergency fund be used for?', options: ['A phone upgrade', 'Unexpected essential costs like a medical bill', 'Weekend trips', 'Buying shares'], answer: 1, explanation: 'It exists for essential surprises only.' },
  { id: 'ms2', domain: 'saving', prompt: 'Saving 5,000 RWF every week for a year gives you:', options: ['60,000 RWF', '120,000 RWF', '260,000 RWF', '365,000 RWF'], answer: 2, explanation: '52 weeks × 5,000 RWF = 260,000 RWF.' },
  { id: 'ms3', domain: 'saving', prompt: 'Which is the best place for an emergency fund?', options: ['A volatile crypto token', 'A friend’s business', 'An accessible savings account or mobile savings wallet', 'Under a mattress'], answer: 2, explanation: 'Safe and accessible beats high-risk or unprotected.' }],

  resources: [bnr, oecd]
},
{
  id: 'm-debt', domain: 'debt', title: 'Borrowing wisely: debt & interest', competency: 'Responsible borrowing',
  summary: 'How interest works, the true cost of digital loans and how to manage more than one debt.',
  minutes: 14, passingScore: 67, published: true,
  objectives: ['Calculate simple interest and total repayment', 'Compare loans by total cost', 'Prioritise repayments across several debts'],
  lessons: [
  {
    title: 'How interest works',
    paragraphs: [
    'Interest is the price of borrowing. Simple interest is charged on the original amount; compound interest is charged on the amount plus interest already added.',
    'Convert rates to the same period before comparing — a weekly rate can look small but add up quickly.'],

    example: '50,000 RWF at 10% simple interest per month for 3 months costs 15,000 RWF in interest: you repay 65,000 RWF.'
  },
  {
    title: 'Digital loans and the true cost',
    paragraphs: [
    'Mobile loans are fast, but fees and short terms can make them expensive. Look at the total amount you will repay, not only the rate.',
    '5% per week is roughly 260% per year in simple terms.'],

    example: 'Borrowing 20,000 RWF for 4 weeks at 5% weekly costs 4,000 RWF — 20% of the loan in one month.'
  },
  {
    title: 'Managing multiple debts',
    paragraphs: [
    'List every debt with its balance, rate and due date. Pay the minimum on all, then put extra money toward the highest-interest debt.',
    'If repayments feel unmanageable, talk to the lender early — missed payments can affect your record with the Credit Reference Bureau.'],

    example: 'Pay off a 15%-per-month digital loan before a 0% loan from family.'
  }],

  activity: { title: 'Compare two loan offers', prompt: 'Lender A offers 30,000 RWF at 8% per month for 2 months. Lender B charges a flat 6,000 RWF fee for 1 month. Work out what you would repay for each and explain which you would choose.' },
  quiz: [
  { id: 'md1', domain: 'debt', prompt: 'You borrow 40,000 RWF at 5% simple interest per month for 2 months. Total repaid?', options: ['42,000 RWF', '44,000 RWF', '48,000 RWF', '40,000 RWF'], answer: 1, explanation: '2,000 interest per month × 2 = 4,000, so 44,000 RWF.' },
  { id: 'md2', domain: 'debt', prompt: 'With several debts, which gets extra payments first under the avalanche method?', options: ['The smallest balance', 'The highest interest rate', 'The newest loan', 'The loan from family'], answer: 1, explanation: 'Highest rate first minimises total interest.' },
  { id: 'md3', domain: 'debt', prompt: 'What matters most when comparing loans?', options: ['The app’s design', 'The total amount you will repay', 'How fast the money arrives', 'The lender’s advertising'], answer: 1, explanation: 'Total cost is the fair comparison.' }],

  resources: [bnr, oecd]
},
{
  id: 'm-investing', domain: 'investing', title: 'Investment basics: risk, return & scams', competency: 'Investment fundamentals',
  summary: 'The link between risk and return, why diversification matters and how to spot investment fraud.',
  minutes: 13, passingScore: 67, published: true,
  objectives: ['Explain the risk–return trade-off', 'Describe diversification', 'Identify the warning signs of investment scams'],
  lessons: [
  {
    title: 'Risk and return',
    paragraphs: [
    'Investments that can earn more usually carry more risk of losing value. Treasury bonds are lower risk; individual shares are higher risk.',
    'Only invest money you won’t need for your emergency fund or near-term costs.'],

    example: 'A Rwandan treasury bond pays a fixed rate; shares on the Rwanda Stock Exchange can rise or fall.'
  },
  {
    title: 'Diversification',
    paragraphs: [
    'Diversification means spreading money across different assets so one loss does not wipe you out.',
    'Funds that pool many investors’ money, such as unit trusts, make diversification possible with small amounts.'],

    example: 'Instead of putting 100,000 RWF in one company, split it across a bond, a unit trust and savings.'
  },
  {
    title: 'Spotting investment scams',
    paragraphs: [
    'Guaranteed high returns, pressure to act fast and rewards for recruiting others are the classic signs of a Ponzi or pyramid scheme.',
    'Check whether a firm is licensed by the Capital Market Authority before sending money.'],

    example: '“Earn 30% a month, guaranteed — just bring two friends” is a red flag, not an opportunity.'
  }],

  activity: { title: 'Spot the red flags', prompt: 'Describe an investment offer you have seen online or heard from friends. List any red flags and explain how you would check whether it is legitimate.' },
  quiz: [
  { id: 'mi1', domain: 'investing', prompt: 'Which investment is generally lowest risk?', options: ['A government treasury bond', 'A single start-up’s shares', 'A new crypto token', 'A pyramid scheme'], answer: 0, explanation: 'Government bonds are among the safest investments.' },
  { id: 'mi2', domain: 'investing', prompt: 'Diversification helps to:', options: ['Guarantee profits', 'Reduce the impact of any single loss', 'Avoid all taxes', 'Double returns'], answer: 1, explanation: 'It limits how much one bad investment can hurt.' },
  { id: 'mi3', domain: 'investing', prompt: 'Which is a warning sign of an investment scam?', options: ['Licensed by the Capital Market Authority', 'Returns that vary over time', 'Guaranteed high returns for recruiting others', 'A published prospectus'], answer: 2, explanation: 'Recruitment-based guaranteed returns signal a pyramid scheme.' }],

  resources: [oecd, { title: 'Investor education', source: 'Capital Market Authority Rwanda', url: 'https://cma.rw' }]
},
{
  id: 'm-digital', domain: 'digital', title: 'Digital money safety', competency: 'Digital financial safety',
  summary: 'Protect your PIN, recognise phishing and choose licensed digital financial services.',
  minutes: 11, passingScore: 67, published: true, onboarding: true,
  objectives: ['Protect PINs, OTPs and devices', 'Recognise phishing and social engineering', 'Check that a financial app is licensed and safe'],
  lessons: [
  {
    title: 'Protect your PIN and accounts',
    paragraphs: [
    'Your mobile money PIN and bank one-time passwords are the keys to your money. No legitimate provider will ever ask you to share them.',
    'Use a PIN that is not your birth year, and lock your phone with a passcode.'],

    example: 'A caller says they sent money “by mistake” and asks for your PIN to reverse it. Hang up and call the official line.'
  },
  {
    title: 'Recognising phishing',
    paragraphs: [
    'Scam messages create urgency — “your account will be blocked today” — and push you to click a link or call a number.',
    'Check the sender, don’t click unfamiliar links, and confirm directly in the official app or USSD menu.'],

    example: 'An SMS says you have won 500,000 RWF and must pay a 5,000 RWF “release fee”. That is a scam.'
  },
  {
    title: 'Choosing digital services safely',
    paragraphs: [
    'Before using a lending or payment app, confirm it is licensed by the National Bank of Rwanda and read what data it collects.',
    'Review app permissions — a loan app has no need for your contacts or photos.'],

    example: 'An unlicensed loan app that threatens to message your contacts is breaking the law — report it.'
  }],

  activity: { title: 'Audit your digital money habits', prompt: 'Review your phone: which financial apps do you use, what permissions do they have, and what is one change you will make to protect your accounts?' },
  quiz: [
  { id: 'mg1', domain: 'digital', prompt: 'An “agent” calls asking for your PIN to fix an error. You should:', options: ['Share it quickly', 'Share only the first two digits', 'Send the money back', 'Refuse — providers never ask for your PIN'], answer: 3, explanation: 'Never share your PIN with anyone.' },
  { id: 'mg2', domain: 'digital', prompt: 'Which message is most likely phishing?', options: ['A receipt for a payment you just made', 'An urgent SMS with a link saying your account will be blocked', 'A balance you requested', 'A statement inside the official app'], answer: 1, explanation: 'Urgency plus a link is the classic phishing pattern.' },
  { id: 'mg3', domain: 'digital', prompt: 'Before using a new loan app, check that it is:', options: ['Popular on social media', 'Licensed by the National Bank of Rwanda', 'The fastest to approve', 'Free to download'], answer: 1, explanation: 'Licensing gives you legal protection.' }],

  resources: [bnr, oecd]
}];