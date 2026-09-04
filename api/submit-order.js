/*
 * Заказ с оплатой на месте (наличными или картой курьеру/на кассе) —
 * без Stripe. Просто уходит уведомление владельцу в Telegram; для
 * этого способа оплаты Telegram — единственный канал, на котором
 * держится заказ, поэтому если бот не настроен, честно отвечаем
 * ошибкой, а не притворяемся, что всё отправилось.
 *
 * Цены, как и в create-checkout-session.js, всегда берутся из
 * data/menu.json на сервере, а не из запроса браузера.
 *
 * Нужные переменные окружения в Vercel:
 *   TELEGRAM_BOT_TOKEN — токен бота от @BotFather
 *   TELEGRAM_CHAT_ID   — id чата/канала, куда слать заказы
 */
var menuItems = require('../data/menu.json');

function toCents(amountEur){
  return Math.round(amountEur * 100);
}
function formatEUR(amountEur){
  return amountEur.toFixed(2).replace('.', ',') + ' €';
}

module.exports = async function handler(req, res){
  if(req.method !== 'POST'){
    res.status(405).json({error: 'Method not allowed'});
    return;
  }

  try{
    var body = req.body || {};
    var requestedItems = Array.isArray(body.items) ? body.items : [];
    var contact = body.contact || {};

    if(!contact.name || !String(contact.name).trim()){
      res.status(400).json({error: 'Укажите имя.'});
      return;
    }
    if(!contact.phone || !String(contact.phone).trim()){
      res.status(400).json({error: 'Укажите телефон.'});
      return;
    }
    var isDelivery = contact.method === 'delivery';
    if(isDelivery && (!contact.address || !String(contact.address).trim())){
      res.status(400).json({error: 'Укажите адрес доставки.'});
      return;
    }

    var lines = [];
    var totalCents = 0;

    requestedItems.forEach(function(reqItem){
      var menuItem = menuItems.filter(function(m){ return m.id === reqItem.id; })[0];
      if(!menuItem) return;
      var qty = Math.min(20, Math.max(1, parseInt(reqItem.qty, 10) || 0));
      if(qty <= 0) return;

      var sumCents = toCents(menuItem.price) * qty;
      totalCents += sumCents;
      var line = menuItem.name + ' × ' + qty + ' — ' + formatEUR(sumCents / 100);
      var comment = reqItem.comment ? String(reqItem.comment).trim().slice(0, 120) : '';
      if(comment){ line += ' («' + comment + '»)'; }
      lines.push(line);
    });

    if(lines.length === 0){
      res.status(400).json({error: 'Корзина пуста.'});
      return;
    }

    var isLater = contact.timeMode === 'later' && contact.time;

    var messageLines = ['💵 Заказ — оплата на месте — УГОЛЬ', ''].concat(lines);
    messageLines.push('', 'Итого: ' + formatEUR(totalCents / 100), '');
    messageLines.push('Имя: ' + String(contact.name).trim().slice(0, 200));
    messageLines.push('Телефон: ' + String(contact.phone).trim().slice(0, 60));
    messageLines.push('Получение: ' + (isDelivery ? 'Доставка' : 'Самовывоз'));
    if(isDelivery){ messageLines.push('Адрес: ' + String(contact.address).trim().slice(0, 300)); }
    messageLines.push('Время: ' + (isLater ? 'к ' + String(contact.time).slice(0, 20) : 'как можно скорее'));
    if(contact.comment && String(contact.comment).trim()){
      messageLines.push('Комментарий: ' + String(contact.comment).trim().slice(0, 300));
    }

    var token = process.env.TELEGRAM_BOT_TOKEN;
    var chatId = process.env.TELEGRAM_CHAT_ID;
    if(!token || !chatId){
      console.error('submit-order: TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID не настроены в Vercel');
      res.status(500).json({error: 'Приём заказов с оплатой на месте пока не настроен. Пожалуйста, позвоните нам.'});
      return;
    }

    var tgRes = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({chat_id: chatId, text: messageLines.join('\n')})
    });

    if(!tgRes.ok){
      console.error('Telegram sendMessage failed:', await tgRes.text());
      res.status(500).json({error: 'Не получилось отправить заказ. Попробуйте ещё раз чуть позже.'});
      return;
    }

    res.status(200).json({url: '/success.html'});
  } catch(err){
    console.error('submit-order error:', err);
    res.status(500).json({error: 'Не получилось отправить заказ. Попробуйте ещё раз чуть позже.'});
  }
};
