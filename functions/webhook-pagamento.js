// Netlify Function — recebe notificação do Mercado Pago e ativa o plano
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const { type, data } = JSON.parse(event.body || '{}');
  if (type !== 'payment') return { statusCode: 200, body: 'ok' };

  const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  try {
    const resp = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` },
    });
    const pagamento = await resp.json();

    if (pagamento.status !== 'approved') return { statusCode: 200, body: 'ok' };

    const [anunciante_id, plano, dias] = (pagamento.external_reference || '').split('|');
    if (!anunciante_id) return { statusCode: 200, body: 'ok' };

    const expira = new Date();
    expira.setDate(expira.getDate() + Number(dias));

    await sb.from('perfis').update({
      tipo_plano: plano,
      plano_ativo: true,
      plano_expira_em: expira.toISOString(),
    }).eq('id', anunciante_id);

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
};
