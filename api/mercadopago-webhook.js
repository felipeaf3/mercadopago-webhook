export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      // Tenta detectar tipo do evento
      const topic = req.body.type || req.body.topic || "unknown";
      let resourceId =
        req.body.data?.id ||
        req.body.resource?.id ||
        req.body.id ||
        null;

      if (!resourceId) {
        console.error("resourceId não recebido");
        return res.status(400).send("No resource id");
      }

      let apiUrl = "";
      if (topic.includes("payment")) {
        apiUrl = `https://api.mercadopago.com/v1/payments/${resourceId}`;
      } else if (topic.includes("merchant_order")) {
        apiUrl = `https://api.mercadopago.com/merchant_orders/${resourceId}`;
      } else {
        console.error("Tipo de evento desconhecido:", topic);
        return res.status(400).send("Tipo de evento não suportado");
      }

      // Busca detalhes na API do MP
      const mpRes = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
        }
      });
      const mpData = await mpRes.json();

      // Determina external_reference e status com fallback
      let externalReference = mpData.external_reference || mpData.preference_id || mpData.id || null;
      let status = mpData.status || mpData.order_status || "unknown";

      console.log(`Evento: ${topic} | Pedido: ${externalReference} | Status: ${status}`);

      // Chama seu HTTP Function no Wix
      const wixRes = await fetch("https://www.sthevamefelipe.com.br/_functions/updateStatus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numeroPedido: externalReference,
          status: status === "approved" ? "pago" : status
        })
      });

      // Blindagem PRO: lê body uma única vez como texto e tenta parsear
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
