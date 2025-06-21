export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      // 🚀 1️⃣ Detecta o tipo do evento
      const topic = req.body.type || req.body.topic || "unknown";

      // 🚀 2️⃣ Busca o ID do recurso de forma universal:
      // - Tenta no body
      // - Tenta nos query params da URL (merchant_order padrão MP)
      const resourceId =
        req.body.data?.id ||
        req.body.resource?.id ||
        req.body.id ||
        req.query.id || // 🔑 Pega da URL!
        null;

      if (!resourceId) {
        console.error("resourceId não recebido");
        return res.status(400).send("No resource id");
      }

      // 🚀 3️⃣ Monta a URL correta conforme o tipo de evento
      let apiUrl = "";
      if (topic.includes("payment")) {
        apiUrl = `https://api.mercadopago.com/v1/payments/${resourceId}`;
      } else if (topic.includes("merchant_order")) {
        apiUrl = `https://api.mercadopago.com/merchant_orders/${resourceId}`;
      } else {
        console.error("Tipo de evento desconhecido:", topic);
        return res.status(400).send("Tipo de evento não suportado");
      }

      // 🚀 4️⃣ Busca os detalhes no Mercado Pago
      const mpRes = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
        }
      });
      const mpData = await mpRes.json();

      // 🚀 5️⃣ Extrai o número do pedido e status, com fallback inteligente
      let externalReference =
        mpData.external_reference || mpData.preference_id || mpData.id || null;
      let status =
        mpData.status || mpData.order_status || "unknown";

      console.log(`Evento: ${topic} | Pedido: ${externalReference} | Status: ${status}`);

      // 🚀 6️⃣ Atualiza no seu Wix
      const wixRes = await fetch(
        "https://www.sthevamefelipe.com.br/_functions/updateStatus",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            numeroPedido: externalReference,
            status: status === "approved" ? "pago" : status
          })
        }
      );

      // 🚀 7️⃣ Lê o retorno do Wix blindado (body lido 1x, parse seguro)
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