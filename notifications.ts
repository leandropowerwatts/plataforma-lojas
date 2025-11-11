import type { Order, Store } from "@shared/schema";

interface NotificationResult {
  email: { sent: boolean; error?: string };
  sms: { sent: boolean; error?: string };
}

export async function sendOrderConfirmation(
  order: Order,
  store: Store
): Promise<NotificationResult> {
  const result: NotificationResult = {
    email: { sent: false },
    sms: { sent: false },
  };

  // Send email if Resend is configured
  if (process.env.RESEND_API_KEY) {
    try {
      await sendEmailNotification(order, store);
      result.email.sent = true;
    } catch (error) {
      result.email.error = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to send email notification:", error);
    }
  }

  // Send SMS if Twilio is configured
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  ) {
    try {
      await sendSmsNotification(order, store);
      result.sms.sent = true;
    } catch (error) {
      result.sms.error = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to send SMS notification:", error);
    }
  }

  return result;
}

async function sendEmailNotification(order: Order, store: Store): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: `${store.name} <onboarding@resend.dev>`,
      to: order.customerEmail,
      subject: `Pedido confirmado - ${store.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: ${store.primaryColor || "#217BF4"};">Obrigado pela sua compra!</h1>
          
          <p>Olá ${order.customerName},</p>
          
          <p>Seu pedido foi confirmado com sucesso! Aqui estão os detalhes:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0;">Resumo do Pedido</h2>
            <p><strong>Número do Pedido:</strong> ${order.id.substring(0, 8).toUpperCase()}</p>
            <p><strong>Total:</strong> R$ ${parseFloat(order.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            <p><strong>Status:</strong> Em processamento</p>
          </div>
          
          <p>Você receberá atualizações sobre o status do seu pedido em breve.</p>
          
          <p>Se tiver alguma dúvida, entre em contato conosco${store.whatsappNumber ? ` pelo WhatsApp: ${store.whatsappNumber}` : ""}.</p>
          
          <p style="margin-top: 30px;">
            Atenciosamente,<br>
            <strong>${store.name}</strong>
          </p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }
}

async function sendSmsNotification(order: Order, store: Store): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  const message = `Olá ${order.customerName}! Seu pedido na ${store.name} foi confirmado. Total: R$ ${parseFloat(order.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. Obrigado pela compra!`;

  // Format phone number to E.164 format (+55...)
  let toNumber = order.customerPhone.replace(/\D/g, "");
  if (!toNumber.startsWith("55")) {
    toNumber = "55" + toNumber;
  }
  if (!toNumber.startsWith("+")) {
    toNumber = "+" + toNumber;
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        From: fromNumber!,
        To: toNumber,
        Body: message,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio API error: ${error}`);
  }
}
