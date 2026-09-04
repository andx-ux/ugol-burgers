/*
 * Принимает вебхук от Stripe о завершённой оплате и шлёт заказ
 * владельцу в Telegram. Токен бота живёт только здесь, на сервере —
 * в отличие от прежней схемы, в браузер он никогда не попадает.
 *
 * Нужные переменные окружения в Vercel:
 *   STRIPE_SECRET_KEY      — тот же секретный ключ Stripe
 *   STRIPE_WEBHOOK_SECRET  — подпись вебхука (whsec_...), Stripe даёт
 *                            её при создании эндпоинта в дашборде
 *   TELEGRAM_BOT_TOKEN     — токен бота от @BotFather (необязательно —
 *                            без него просто не будет уведомления)
 *   TELEGRAM_CHAT_ID       — id чата/канала, куда слать заказы
 *
 * Адрес для настройки в Stripe Dashboard → Developers → Webhooks:
 *   https://<ваш-домен>/api/webhook
 * Событие для подписки: checkout.session.completed
 */
var Stripe = require('stripe');

var stripe = Stripe(process.env.STRIPE_SECRET_KEY);

module.exports.config = {
  api: {bodyParser: false} // нужен сырой body для проверки подписи Stripe
};

function readRawBody(req){
  return new Promise(function(resolve, reject){
    var chunks = [];
    req.on('data', function(chunk){ chunks.push(chunk); });
    req.on('end', function(){ resolve(Buffer.concat(chunks)); });
    req.on('error', reject);
  });
}

function formatEUR(amountEur){
  return amountEur.toFixed(2).replace('.', ',') + ' €';
}

async function notifyTelegram(session){
  var token = process.env.TELEGRAM_BOT_TOKEN;
  var chatId = process.env.TELEGRAM_CHAT_ID;
  if(!token || !chatId) return;

  var lineItemsRes = await stripe.checkout.sessions.listLineItems(session.id, {limit: 100});
  var md = session.metadata || {};

  var lines = ['✅ Оплаченный заказ — УГОЛЬ', ''];
  lineItemsRes.data.forEach(function(li){
    lines.push(li.description + ' × ' + li.quantity + ' — ' + formatEUR(li.amount_total / 100));
  });
  lines.push('', 'Итого: ' + formatEUR((session.amount_total || 0) / 100), '');
  lines.push('Имя: ' + (md.contact_name || '—'));
  lines.push('Телефон: ' + (md.contact_phone || '—'));
  lines.push('Получение: ' + (md.method === 'delivery' ? 'Доставка' : 'Самовывоз'));
  if(md.method === 'delivery' && md.address){ lines.push('Адрес: ' + md.address); }
  lines.push('Время: ' + (md.time === 'asap' ? 'как можно скорее' : 'к ' + md.time));
  if(md.order_comment){ lines.push('Комментарий: ' + md.order_comment); }
  if(md.item_comments){ lines.push('Комментарии к позициям: ' + md.item_comments); }

  var text = lines.join('\n');

  await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({chat_id: chatId, text: text})
  });
}

module.exports = async function handler(req, res){
  if(req.method !== 'POST'){
    res.status(405).end();
    return;
  }

  var event;
  try{
    var rawBody = await readRawBody(req);
    var signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch(err){
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send('Webhook Error: ' + err.message);
    return;
  }

  if(event.type === 'checkout.session.completed'){
    try{
      await notifyTelegram(event.data.object);
    } catch(err){
      // Stripe уже засчитал оплату успешной — ошибка уведомления не должна
      // заставлять Stripe повторно слать этот вебхук, поэтому просто логируем.
      console.error('Telegram notify failed:', err);
    }
  }

  res.status(200).json({received: true});
};
