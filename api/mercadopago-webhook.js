import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  const wixFunctionUrl = process.env.WIX_HTTP_FUNCTION_URL;

  try {
    const body = req.body;
    const paymentId = body.data.id;

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const payment = await response.json();

    const numeroPedido = payment.external_reference;
    const status = payment.status;

    console.log(`Pagamento recebido: ${paymentId} | Pedido: ${numeroPedido} | Status: ${status}`);

    await fetch(wixFunctionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numeroPedido: Number(numeroPedido),
        status: status
      })
    });

    res.status(200).json({ received: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}