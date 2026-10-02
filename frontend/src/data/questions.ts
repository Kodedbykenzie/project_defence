import type { Question } from '../types/platform';

export const diagnosticQuestions: Question[] = [
{
  id: 'q1', domain: 'budgeting',
  prompt: 'Your monthly stipend is 150,000 RWF. Using the 50/30/20 guideline, how much should go to savings or debt repayment?',
  options: ['15,000 RWF', '30,000 RWF', '45,000 RWF', '75,000 RWF'], answer: 1,
  explanation: '20% of 150,000 RWF is 30,000 RWF.'
},
{
  id: 'q2', domain: 'budgeting',
  prompt: 'Which of these is a fixed cost for most students?',
  options: ['Monthly rent', 'Weekend outings', 'Snacks between classes', 'Clothes shopping'], answer: 0,
  explanation: 'Rent is the same amount every month, so it is a fixed cost.'
},
{
  id: 'q3', domain: 'budgeting',
  prompt: 'Halfway through the month you have spent 70% of your food budget. What is the most effective response?',
  options: ['Borrow from a friend and repay later', 'Stop tracking so you worry less', 'Cut back and move money from a flexible category', 'Wait for next month’s stipend'], answer: 2,
  explanation: 'Reallocating from flexible spending keeps you within your budget without new debt.'
},
{
  id: 'q4', domain: 'saving',
  prompt: 'A common guideline is that an emergency fund should cover…',
  options: ['One week of spending', '3–6 months of essential expenses', 'One year of all spending', 'Only your tuition fees'], answer: 1,
  explanation: 'Three to six months of essential costs protects you from most shocks.'
},
{
  id: 'q5', domain: 'saving',
  prompt: 'You save 10,000 RWF every month in an account paying no interest. How much do you have after one year?',
  options: ['100,000 RWF', '110,000 RWF', '130,000 RWF', '120,000 RWF'], answer: 3,
  explanation: '12 months × 10,000 RWF = 120,000 RWF.'
},
{
  id: 'q6', domain: 'saving',
  prompt: 'Where is an emergency fund best kept?',
  options: ['An accessible savings account or mobile savings wallet', 'Shares in a single company', 'Lent out to friends', 'A new side business'], answer: 0,
  explanation: 'Emergency money must be safe and quickly available.'
},
{
  id: 'q7', domain: 'debt',
  prompt: 'You borrow 50,000 RWF at 10% simple interest per month for 3 months. How much do you repay in total?',
  options: ['55,000 RWF', '50,000 RWF', '65,000 RWF', '80,000 RWF'], answer: 2,
  explanation: '10% of 50,000 = 5,000 per month × 3 = 15,000 interest, so 65,000 RWF.'
},
{
  id: 'q8', domain: 'debt',
  prompt: 'A digital lender advertises “only 5% per week”. Roughly what is that as a simple annual rate?',
  options: ['5%', '20%', '60%', '260%'], answer: 3,
  explanation: '5% × 52 weeks ≈ 260% per year.'
},
{
  id: 'q9', domain: 'debt',
  prompt: 'You have several debts. Which strategy usually costs the least overall?',
  options: ['Pay only the minimum on everything', 'Pay minimums, then put extra toward the highest-interest debt', 'Take a new loan to pay the smallest debt', 'Pay whichever lender contacts you most'], answer: 1,
  explanation: 'Targeting the highest rate first (the avalanche method) minimises total interest.'
},
{
  id: 'q10', domain: 'investing',
  prompt: 'What does diversification mean?',
  options: ['Putting all your money into one strong company', 'Buying and selling every day', 'Spreading money across different assets to reduce risk', 'Keeping everything in cash'], answer: 2,
  explanation: 'Spreading investments means one loss has a smaller effect.'
},
{
  id: 'q11', domain: 'investing',
  prompt: 'Generally, investments with higher potential returns come with…',
  options: ['Lower risk', 'Higher risk', 'No risk', 'Guaranteed profit'], answer: 1,
  explanation: 'Risk and potential return usually move together.'
},
{
  id: 'q12', domain: 'investing',
  prompt: 'A friend promises guaranteed 30% monthly returns if you invest and recruit others. This is most likely…',
  options: ['A Ponzi or pyramid scheme', 'A government bond', 'A savings account', 'A regulated unit trust'], answer: 0,
  explanation: 'Guaranteed high returns plus recruitment rewards are classic scam signs.'
},
{
  id: 'q13', domain: 'digital',
  prompt: 'Someone calls saying they are from your mobile money provider and asks for your PIN to reverse a transaction. You should…',
  options: ['Share it so the error is fixed', 'Share only the first two digits', 'Send the money back to their number', 'Refuse and hang up — providers never ask for your PIN'], answer: 3,
  explanation: 'No legitimate provider will ever ask for your PIN.'
},
{
  id: 'q14', domain: 'digital',
  prompt: 'Which SMS is the strongest sign of a phishing attempt?',
  options: ['A receipt for a payment you just made', 'An urgent message with a link to avoid account suspension', 'A balance you requested via USSD', 'A message written in Kinyarwanda'], answer: 1,
  explanation: 'Urgency plus an unfamiliar link is the hallmark of phishing.'
},
{
  id: 'q15', domain: 'digital',
  prompt: 'Before using a new digital lending app, you should first check…',
  options: ['How many adverts it runs', 'Whether your friends use it', 'That it is licensed by the National Bank of Rwanda and its total cost', 'How quickly it approves loans'], answer: 2,
  explanation: 'Licensing and total cost protect you from predatory lenders.'
}];