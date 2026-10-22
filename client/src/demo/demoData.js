// Deterministic demo dataset for "Atelier Lagos". Nothing here touches the real database.

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const STORE = { name: 'Atelier Lagos', area: 'Lekki, Lagos', target: 2700000 };

export const naira = (n) => `₦${Math.round(n).toLocaleString('en-NG')}`;
export const nairaCompact = (n) =>
  n >= 1e6 ? `₦${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `₦${(n / 1e3).toFixed(1)}K` : `₦${Math.round(n)}`;

export const PRODUCTS = [
  { name: 'Ankara Maxi Dress', cat: 'Ankara', price: 38500 },
  { name: 'Silk Wrap Dress', cat: 'Dresses', price: 54000 },
  { name: 'Lace Two-Piece Set', cat: 'Two-piece sets', price: 67500 },
  { name: 'Embroidered Agbada', cat: 'Agbada & Kaftans', price: 185000 },
  { name: 'Linen Kaftan', cat: 'Agbada & Kaftans', price: 42000 },
  { name: 'Leather Slide Sandals', cat: 'Shoes', price: 28500 },
  { name: 'Structured Tote Bag', cat: 'Bags', price: 46000 },
  { name: 'Asoebi Gown', cat: 'Dresses', price: 92000 },
  { name: 'Ankara Peplum Top', cat: 'Ankara', price: 19500 },
  { name: 'Pleated Trousers', cat: 'Trousers', price: 24000 },
];

export const CATEGORIES = [
  { name: 'Ankara', value: 512400 },
  { name: 'Dresses', value: 428900 },
  { name: 'Two-piece sets', value: 331800 },
  { name: 'Agbada & Kaftans', value: 267300 },
  { name: 'Shoes', value: 178600 },
  { name: 'Bags', value: 123500 },
];

const BUYERS = [
  'Chioma A.', 'Tolu B.', 'Ngozi E.', 'Femi O.', 'Amaka N.', 'Ibrahim S.', 'Kemi A.',
  'Sade L.', 'Uche M.', 'Bisi T.', 'Yemi K.', 'Halima Y.', 'Dayo F.', 'Efe P.',
];

export const START = { revenue: 1842500, orders: 47, items: 71, debts: 685000 };

// 8am -> 5pm hourly revenue (sums to START.revenue)
export function hourlySeries() {
  const weights = [0.03, 0.05, 0.08, 0.11, 0.14, 0.12, 0.13, 0.15, 0.19];
  const total = weights.reduce((a, b) => a + b, 0);
  const labels = ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm'];
  let used = 0;
  return weights.map((w, i) => {
    const revenue = i === weights.length - 1 ? START.revenue - used : Math.round((START.revenue * w) / total / 500) * 500;
    used += revenue;
    return { hour: labels[i], revenue, profit: Math.round(revenue * 0.38) };
  });
}

export function sparkSeries(seed, base = 100) {
  const r = rng(seed);
  let v = base;
  return Array.from({ length: 14 }, (_, i) => {
    v = Math.max(20, v + (r() - 0.42) * base * 0.18);
    return { i, v: Math.round(v) };
  });
}

export const PEAK = (() => {
  const r = rng(7);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((d, di) => ({
    day: d,
    hours: Array.from({ length: 12 }, (_, h) => {
      const hour = h + 9;
      const eve = hour >= 16 && hour <= 19 ? 0.5 : 0;
      const wk = di >= 4 ? 0.25 : 0;
      return Math.min(1, 0.12 + eve + wk + r() * 0.3);
    }),
  }));
})();

export const TOP_PRODUCTS = [
  { name: 'Ankara Maxi Dress', units: 38, revenue: 1463000 },
  { name: 'Lace Two-Piece Set', units: 21, revenue: 1417500 },
  { name: 'Silk Wrap Dress', units: 24, revenue: 1296000 },
  { name: 'Structured Tote Bag', units: 22, revenue: 1012000 },
  { name: 'Linen Kaftan', units: 19, revenue: 798000 },
];

export const LOW_STOCK = [
  { name: 'Ankara Maxi Dress', variant: 'Size 12 · Blue', left: 3 },
  { name: 'Silk Wrap Dress', variant: 'Size 10 · Champagne', left: 2 },
  { name: 'Leather Slide Sandals', variant: 'Size 40 · Tan', left: 1 },
];

export function makeSale(r) {
  const p = PRODUCTS[Math.floor(r() * PRODUCTS.length)];
  const qty = r() < 0.2 ? 2 : 1;
  const buyer = BUYERS[Math.floor(r() * BUYERS.length)];
  const channel = r() < 0.35 ? 'WhatsApp' : 'In store';
  return { product: p.name, cat: p.cat, qty, amount: p.price * qty, buyer, channel };
}

// ── Scripted WhatsApp scenarios ────────────────────────────────
// step: { from: 'customer'|'bot', text?, card?, event? }
export const SCENARIOS = [
  {
    id: 'stock',
    customer: { name: 'Chioma A.', phone: '+234 803 555 0142' },
    steps: [
      { from: 'customer', text: 'Good evening, do you have the Ankara maxi dress in size 12?' },
      {
        from: 'bot',
        text: "Good evening Chioma 👋 Thanks for messaging Atelier Lagos. The team is away until 9am, but I can help right now.\n\nYes, the Ankara Maxi Dress is available in size 12 (3 left).",
      },
      {
        from: 'bot',
        card: {
          title: 'In stock · Ankara Maxi Dress',
          rows: [['Size 10', '2 left'], ['Size 12', '3 left'], ['Size 14', '5 left']],
          price: '₦38,500',
        },
      },
      { from: 'customer', text: "Lovely. I'll take the size 12 please" },
      {
        from: 'bot',
        text: "Done ✅ I've held the size 12 for you until 9am. The team will confirm delivery or pickup first thing.",
        event: { type: 'lead', label: 'Lead saved · Chioma A.' },
      },
      { from: 'sale', label: 'Sale created · ₦38,500', event: { type: 'sale', amount: 38500, items: 1, buyer: 'Chioma A.', product: 'Ankara Maxi Dress', channel: 'WhatsApp' } },
    ],
  },
  {
    id: 'delivery',
    customer: { name: 'Femi O.', phone: '+234 706 555 0187' },
    steps: [
      { from: 'customer', text: 'Hi. Do you deliver to Ikeja? And how do I pay?' },
      {
        from: 'bot',
        text: 'Hello Femi 👋 Yes, we deliver across Lagos.\n\n• Island: ₦2,500 (same day)\n• Mainland incl. Ikeja: ₦3,500 (1 to 2 days)\n\nYou can pay by bank transfer or card. We send the details with your order.',
      },
      { from: 'customer', text: 'Okay. I want the lace two-piece set, size M' },
      {
        from: 'bot',
        card: {
          title: 'Lace Two-Piece Set · Size M',
          rows: [['Item', '₦67,500'], ['Delivery (Ikeja)', '₦3,500'], ['Total', '₦71,000']],
          price: '',
        },
      },
      {
        from: 'bot',
        text: "I've saved your details. The team will send the payment link in the morning 💛",
        event: { type: 'lead', label: 'Lead saved · Femi O.' },
      },
      { from: 'sale', label: 'Invoice drafted · ₦71,000', event: { type: 'invoice', amount: 71000, buyer: 'Femi O.', product: 'Lace Two-Piece Set', channel: 'WhatsApp' } },
    ],
  },
  {
    id: 'returning',
    customer: { name: 'Tola B.', phone: '+234 810 555 0109' },
    steps: [
      { from: 'customer', text: 'Hello 🙂' },
      {
        from: 'bot',
        text: "Welcome back Tola! 💛 Great to see you again. You last shopped with us on 14 Aug.\n\nNew since then:",
      },
      {
        from: 'bot',
        card: {
          title: 'New arrivals',
          rows: [['Asoebi Gown', '₦92,000'], ['Embroidered Agbada', '₦185,000'], ['Linen Kaftan', '₦42,000']],
          price: '',
        },
      },
      { from: 'customer', text: "Ooh the linen kaftan. I'll pass by on Saturday" },
      {
        from: 'bot',
        text: "Lovely, we'll keep one aside for Saturday. Open 10am to 7pm 😊",
        event: { type: 'lead', label: 'Returning customer · Tola B.' },
      },
      { from: 'sale', label: 'Pickup reserved · ₦42,000', event: { type: 'reserve', amount: 42000, buyer: 'Tola B.', product: 'Linen Kaftan', channel: 'WhatsApp' } },
    ],
  },
];
