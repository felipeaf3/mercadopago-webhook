export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const paymentId = req.body.data?.id;
      if (!paymentId) {
        console.error("paymentId não recebido");
        return res.status(400).send("No payment id");
      }

      // Busca detalhes do pagamento na API do Mercado Pago
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
        }
      });
      const payment = await mpRes.json();

      const externalReference = payment.external_reference;
      const status = payment.status;

      console.log(`Pagamento recebido | Pedido: ${externalReference} | Status: ${status}`);

      // Chama seu HTTP Function no Wix
      const wixRes = await fetch("https://www.sthevamefelipe.com.br/_functions/updateStatus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numeroPedido: externalReference,
          status: status === "approved" ? "pago" : status
        })
      });

      // Blindagem: lê o body UMA vez como texto, tenta parsear, fallback para texto cru
      const rawBody = await wixRes.text();
      let wixJson;
      try {
        wixJson = JSON.parse(rawBody);
      } catch {
        wixJson = { raw: rawBody };
      }
      console.log("Resposta do Wix:", wixJson);

      return res.status(200).send("OK");
    } catch (err) {
      console.error("Erro:", err);
      return res.status(500).send(err.message);
    }
  } else {
    res.status(405).send("Method Not Allowed");
  }
}
