// The WhatsApp assistant's brain: reads a customer's message and answers from live inventory + settings.
// Pure functions, no imports. The side-panel preview and the (future) live WhatsApp connection both use it.
const fmt = (n) => `₦${Math.round(n).toLocaleString('en-NG')}`;
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set(['the', 'and', 'for', 'you', 'have', 'with', 'size', 'price', 'how', 'much', 'this', 'that', 'your', 'can', 'any', 'please', 'pls', 'available', 'stock', 'buy', 'want', 'need', 'looking', 'what', 'got', 'still', 'send', 'take', 'order', 'deliver', 'delivery', 'pay', 'hello', 'good', 'evening', 'morning', 'afternoon', 'catalogue', 'list', 'else', 'ikeja', 'account', 'details', 'okay', 'thanks']);
const SIZE_WORDS = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl'];

export function groupProducts(products) {
  const m = new Map();
  for (const p of products) {
    const g = m.get(p.name) || { name: p.name, category: p.category, variants: [] };
    g.variants.push(p);
    m.set(p.name, g);
  }
  return [...m.values()].map((g) => ({
    ...g,
    price: Math.min(...g.variants.map((v) => v.price)),
    total: g.variants.reduce((t, v) => t + v.stock_quantity, 0),
  }));
}

const words = (s) => norm(s).split(' ').filter(Boolean);
const stem = (w) => w.replace(/(es|s)$/, '');

// Which product is the customer talking about?
export function findProduct(text, groups) {
  const toks = words(text).filter((t) => t.length >= 3 && !STOP.has(t)).map(stem);
  if (!toks.length) return { match: null, options: [] };
  const scored = groups.map((g) => {
    const nameWords = words(g.name).map(stem);
    const colorWords = g.variants.flatMap((v) => words(v.color || '')).map(stem);
    const hit = toks.filter((t) => nameWords.includes(t)).length;
    const colorHit = toks.filter((t) => colorWords.includes(t)).length;
    return { g, score: hit * 2 + (hit ? colorHit : 0) };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score || b.g.total - a.g.total);
  if (!scored.length) return { match: null, options: [] };
  const top = scored.filter((x) => x.score === scored[0].score);
  if (scored[0].score >= 4 || top.length === 1) return { match: scored[0].g, options: [] };
  return { match: null, options: top.slice(0, 3).map((x) => x.g) };
}

function detectSize(text, group) {
  const t = norm(text);
  const sizes = group ? group.variants.map((v) => String(v.size || '').toLowerCase()) : [];
  const m = /size\s+([a-z0-9]+)/.exec(t);
  if (m) return m[1].toUpperCase();
  for (const w of t.split(' ')) {
    if (SIZE_WORDS.includes(w) && (w.length > 1 || sizes.includes(w))) return w.toUpperCase();
    if (/^\d{1,2}$/.test(w) && sizes.includes(w)) return w;
  }
  return null;
}

const sizeLabel = (v) => (/size/i.test(String(v.size)) || !v.size ? String(v.size || 'One size') : `Size ${v.size}`) + (v.color ? ` · ${v.color}` : '');
const left = (n) => (n <= 0 ? 'sold out' : n <= 3 ? `only ${n} left` : `${n} left`);

function describe(group, size) {
  const inStock = group.variants.filter((v) => v.stock_quantity > 0);
  if (size) {
    const same = group.variants.filter((v) => String(v.size || '').toUpperCase() === size);
    const have = same.filter((v) => v.stock_quantity > 0);
    if (have.length) {
      const n = have.reduce((t, v) => t + v.stock_quantity, 0);
      const colors = [...new Set(have.map((v) => v.color).filter(Boolean))];
      return {
        ok: true, size, price: have[0].price,
        text: `Yes! The ${group.name} is available in size ${size} (${left(n)})${colors.length ? ` in ${colors.join(' / ')}` : ''}. It's ${fmt(have[0].price)}.`,
        card: { title: `In stock · ${group.name}`, rows: have.map((v) => [sizeLabel(v), left(v.stock_quantity)]), price: fmt(have[0].price) },
      };
    }
    const others = inStock.map((v) => `${v.size} (${v.stock_quantity})`).join(', ');
    return {
      ok: false,
      text: `Sorry, the ${group.name} in size ${size} is ${same.length ? 'sold out' : 'not something we carry'}.${others ? ` Sizes we have right now: ${others}.` : ' It is out of stock at the moment.'}`,
      card: inStock.length ? { title: `Available · ${group.name}`, rows: inStock.map((v) => [sizeLabel(v), left(v.stock_quantity)]), price: fmt(inStock[0].price) } : null,
    };
  }
  if (!inStock.length) return { ok: false, text: `Sorry, the ${group.name} is sold out right now. I'll let the team know you asked.`, card: null };
  const only = inStock.length === 1;
  return {
    ok: true, size: only ? String(inStock[0].size || 'One size') : null, price: inStock[0].price,
    text: only
      ? `Yes, the ${group.name} is in stock (${left(inStock[0].stock_quantity)}) at ${fmt(inStock[0].price)}.`
      : `Yes, the ${group.name} is in stock at ${fmt(inStock[0].price)}. Which size would you like?`,
    card: { title: `In stock · ${group.name}`, rows: inStock.map((v) => [sizeLabel(v), left(v.stock_quantity)]), price: fmt(inStock[0].price) },
  };
}

function catalogue(groups) {
  const list = groups.filter((g) => g.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);
  if (!list.length) return { text: 'Our catalogue is being updated. The team will share it shortly 🙏', card: null };
  return {
    text: "Here's some of what's in stock right now:",
    card: { title: 'In stock now', rows: list.map((g) => [g.name, fmt(g.price)]), price: '' },
  };
}

function paymentText(total, s) {
  if (!s.account_number) return 'Thank you! The team will send you the payment details as soon as they are back 🙏';
  return `Great choice! Please transfer ${total ? fmt(total) : 'the amount'} to:\n\n🏦 ${s.bank_name || 'Bank'}\n🔢 ${s.account_number}\n👤 ${s.account_name || s.store_name || ''}\n\nSend your proof of payment here and we'll confirm your order.`;
}

const has = (t, re) => re.test(t);

/**
 * replyTo("do you have the ankara dress in size 12", { products, settings, ctx })
 *  -> { replies: [{ text?, card?, chips?: [{ label, event? }] }], ctx }
 */
export function replyTo(message, { products, settings, ctx = {} }) {
  const s = settings || {};
  const t = norm(message);
  const groups = groupProducts(products || []);
  const next = { ...ctx };
  const replies = [];
  const first = (ctx.name || '').split(' ')[0];

  const intro = !ctx.greeted && !ctx.returning
    ? `Hello${first ? ` ${first}` : ''} 👋 Thanks for messaging ${s.store_name || 'us'}.${s.owner_available === 'false' || s.away ? " We're away right now, but I can help." : ''}`
    : '';
  next.greeted = true;
  const say = (r) => {
    const out = { ...r };
    if (intro && !replies.length) out.text = out.text ? `${intro}\n\n${out.text}` : intro;
    replies.push(out);
  };
  const lead = { label: `Lead saved · ${ctx.name || 'New customer'}`, event: { type: 'lead', label: `Lead saved · ${ctx.name || 'New customer'}` } };

  const leadOnce = () => { if (next.leadSaved) return []; next.leadSaved = true; return [lead]; };

  const wantsToBuy = has(t, /\b(i ll take|i will take|take it|i want|i want it|i d like|order|buy|how do i pay|how to pay|pay|account|transfer|send details|payment)\b/);
  const { match, options } = findProduct(message, groups);

  if (match) {
    const size = detectSize(message, match);
    const d = describe(match, size);
    next.lastProduct = match.name; next.lastSize = d.size || null; next.lastPrice = d.ok ? d.price : null;
    say({ text: d.text, card: d.card });
    if (d.ok && wantsToBuy && d.size) {
      say({ text: paymentText(d.price, s), chips: [...leadOnce(), { label: `Order reserved · ${fmt(d.price)}`, event: { type: 'sale', product: match.name, amount: d.price, buyer: ctx.name || 'New customer', channel: 'WhatsApp' } }] });
      next.lastProduct = null;
    } else if (d.ok) {
      replies[replies.length - 1].chips = leadOnce();
    }
  } else if (options.length) {
    say({ text: 'Which of these did you mean?', card: { title: 'Did you mean…', rows: options.map((g) => [g.name, fmt(g.price)]), price: '' } });
  } else if (wantsToBuy && ctx.lastProduct) {
    const g = groups.find((x) => x.name === ctx.lastProduct);
    const price = ctx.lastPrice || g?.price || 0;
    say({ text: paymentText(price, s), chips: [...leadOnce(), { label: `Order reserved · ${fmt(price)}`, event: { type: 'sale', product: ctx.lastProduct, amount: price, buyer: ctx.name || 'New customer', channel: 'WhatsApp' } }] });
    next.lastProduct = null;
  } else if (has(t, /\b(deliver|delivery|ship|shipping|courier)\b/)) {
    say({ text: s.delivery_info || 'Yes, we deliver. The team will confirm the delivery fee for your area.' });
  } else if (has(t, /\b(open|close|closing|opening|hours|time)\b/)) {
    say({ text: s.opening_hours ? `We're open ${s.opening_hours} 😊` : 'The team will reply as soon as they are back 😊' });
  } else if (has(t, /\b(catalogue|catalog|list|what do you have|what else|new arrivals?|latest|show me)\b/)) {
    say(catalogue(groups));
  } else if (has(t, /\b(thank|thanks|thank you)\b/)) {
    say({ text: "You're welcome! 💛 Message us any time." });
  } else if (has(t, /^(hi|hello|hey|good morning|good afternoon|good evening|hello there)\b/)) {
    say({ text: ctx.returning ? `Welcome back${first ? ` ${first}` : ''}! 💛 Would you like to see what's new?` : 'How can I help you today? Ask me about any item, size or price.' });
  } else {
    say({ text: "Thanks for your message! I've passed it to the team and they'll reply as soon as they're back 🙏", chips: leadOnce() });
  }
  return { replies, ctx: next };
}

// ── Demo / preview conversations, built from whatever is actually in stock ──
const PEOPLE = [
  ['Chioma Adeyemi', '+234 803 555 0142'], ['Femi Balogun', '+234 706 555 0187'],
  ['Tola Okafor', '+234 810 555 0109'], ['Amaka Eze', '+234 907 555 0133'], ['Ibrahim Bello', '+234 813 555 0168'],
];

export function buildScripts(products, rand = Math.random) {
  const groups = groupProducts(products || []).filter((g) => g.total > 0);
  const pick = (a) => a[Math.floor(rand() * a.length)];
  if (!groups.length) {
    return [{ person: PEOPLE[0], lines: ['Hi, what do you have in stock?', 'Okay, thank you'] }];
  }
  const low = groups.filter((g) => g.variants.some((v) => v.stock_quantity > 0 && v.stock_quantity <= 4));
  const g1 = pick(low.length ? low : groups);
  const v1 = pick(g1.variants.filter((v) => v.stock_quantity > 0));
  const g2 = pick(groups);
  const g3 = pick(groups);
  const v3 = pick(g3.variants.filter((v) => v.stock_quantity > 0));
  const g4 = pick(groups);
  const sizesOf2 = new Set(g2.variants.map((v) => String(v.size)));
  const missing = ['XXL', '46', '16', 'XS'].find((x) => !sizesOf2.has(x)) || 'XXXL';
  return [
    { person: PEOPLE[0], lines: [`Good evening, do you have the ${g1.name} in size ${v1.size}?`, "Lovely. I'll take it, how do I pay?"] },
    { person: PEOPLE[1], lines: [`Hi, is the ${g2.name} available in size ${missing}?`, 'Okay, what else do you have?'] },
    { person: PEOPLE[2], returning: true, lines: ['Hello 🙂', `How much is the ${g3.name}?`, `I'll take size ${v3.size}, please send account details`] },
    { person: PEOPLE[3], lines: [`Please how much is the ${g4.name}`, 'Do you deliver to Ikeja?', 'Thank you'] },
  ];
}
