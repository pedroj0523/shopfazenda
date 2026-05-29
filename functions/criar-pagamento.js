// Netlify Function — cria preferência de pagamento no Mercado Pago
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { plano, anunciante_id, email } = JSON.parse(event.body);

  const planos = {
    bronze:  { nome: 'ShopFazenda Bronze — 30 dias',  preco: 79,  dias: 30  },
    prata:   { nome: 'ShopFazenda Prata — 60 dias',   preco: 149, dias: 60  },
    ouro:    { nome: 'ShopFazenda Ouro — 120 dias',   preco: 249, dias: 120 },
    revenda: { nome: 'ShopFazenda Revenda — 180 dias', preco: 349, dias: 180 },
  };

  const p = planos[plano];
  if (!p) return { statusCode: 400, body: 'Plano inválido' };

  const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  const BASE_URL = process.env.URL || 'https://shopfazenda.com.br';

  const preference = {
    items: [{
      title: p.nome,
      quantity: 1,
      unit_price: p.preco,
      currency_id: 'BRL',
    }],
    payer: { email },
    back_urls: {
      success: `${BASE_URL}?pagamento=sucesso&plano=${plano}&uid=${anunciante_id}`,
      failure: `${BASE_URL}?pagamento=falha`,
      pending: `${BASE_URL}?pagamento=pendente`,
    },
    auto_return: 'approved',
    external_reference: `${anunciante_id}|${plano}|${p.dias}`,
    notification_url: `${BASE_URL}/.netlify/functions/webhook-pagamento`,
    payment_methods: {
      installments: 3,
    },
  };

  try {
    const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });
    const data = await resp.json();
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ init_point: data.init_point, id: data.id }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
