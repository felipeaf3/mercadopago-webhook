import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const body = req.body;
    const topic = body.topic || body.type || "";
    const data = body.data || {};
    const paymentId = data.id || "";
    let numeroPedido = "";
    let status = "";

    console.log("Evento recebido:", topic);

    if (topic === "payment") {
      const paymentResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${process.env.MP_TOKEN}`
        }
      });

      const paymentTexto = await paymentResp.text();
      console.log("Raw Payment Response:", paymentTexto);

      let paymentData = {};
      try {
        paymentData = JSON.parse(paymentTexto);
      } catch (e) {
        console.error("Erro parse Payment JSON:", e);
      }

      numeroPedido = paymentData.external_reference || "";
      status = paymentData.status || "";

      console.log(`Payment: Pedido ${numeroPedido} | Status: ${status}`);

    } else if (topic === "merchant_order") {
      const orderResp = await fetch(`https://api.mercadopago.com/merchant_orders/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${process.env.MP_TOKEN}`
        }
      });

      const orderTexto = await orderResp.text();
      console.log("Raw Order Response:", orderTexto);

      let orderData = {};
      try {
        orderData = JSON.parse(orderTexto);
      } catch (e) {
        console.error("Erro parse Order JSON:", e);
      }

      numeroPedido = orderData.external_reference || "";
      status = orderData.status || "";

      console.log(`Merchant Order: Pedido ${numeroPedido} | Status: ${status}`);

    } else {
      console.log("Evento não tratado:", topic);
      return res.status(200).json({ msg: "Evento ignorado" });
    }

    // ✅ Chama o Wix com .text() também
    if (status === "approved" || status === "closed") {
      const wixResp = await fetch(process.env.WIX_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numeroPedido: numeroPedido,
          status: "aprovado"
        }),
      });

      const respostaTexto = await wixResp.text();
      console.log("Resposta do Wix:", respostaTexto);
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("Erro no webhook:", err);
    return res.status(500).json({ error: "Erro no servidor webhook" });
  }
}