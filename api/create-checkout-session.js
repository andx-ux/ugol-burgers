/*
 * Создаёт Stripe Checkout Session и возвращает ссылку на оплату.
 *
 * Цены НИКОГДА не берутся из запроса браузера — только из
 * data/menu.json на сервере, иначе кто угодно мог бы подделать
 * сумму в форме перед отправкой.
 *
 * Нужные переменные окружения в Vercel:
 *   STRIPE_SECRET_KEY — секретный ключ Stripe (sk_test_... / sk_live_...)
 */
var Stripe = require('stripe');
var menuItems = require('../data/menu.json');

var stripe = Stripe(process.env.STRIPE_SECRET_KEY);

function toCents(amountEur){
  return Math.round(amountEur * 100);
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

    var lineItems = [];
    var itemComments = [];

    requestedItems.forEach(function(reqItem){
      var menuItem = menuItems.filter(function(m){ return m.id === reqItem.id; })[0];
      if(!menuItem) return;
      var qty = Math.min(20, Math.max(1, parseInt(reqItem.qty, 10) || 0));
      if(qty <= 0) return;

      lineItems.push({
        quantity: qty,
        price_data: {
          currency: 'eur',
          unit_amount: toCents(menuItem.price),
          product_data: {name: menuItem.name}
        }
      });

      var comment = reqItem.comment ? String(reqItem.comment).trim().slice(0, 120) : '';
      if(comment){ itemComments.push(menuItem.name + ': ' + comment); }
    });

    if(lineItems.length === 0){
      res.status(400).json({error: 'Корзина пуста.'});
      return;
    }

    var isLater = contact.timeMode === 'later' && contact.time;
    var origin = 'https://' + req.headers.host;

    var session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: origin + '/success.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: origin + '/cancel.html',
      metadata: {
        contact_name: String(contact.name).trim().slice(0, 200),
        contact_phone: String(contact.phone).trim().slice(0, 60),
        method: isDelivery ? 'delivery' : 'pickup',
        address: isDelivery ? String(contact.address).trim().slice(0, 300) : '',
        time: isLater ? String(contact.time).slice(0, 20) : 'asap',
        order_comment: contact.comment ? String(contact.comment).trim().slice(0, 300) : '',
        item_comments: itemComments.join(' | ').slice(0, 480)
      }
    });

    res.status(200).json({url: session.url});
  } catch(err){
    console.error('create-checkout-session error:', err);
    res.status(500).json({error: 'Не получилось создать оплату. Попробуйте ещё раз чуть позже.'});
  }
};
