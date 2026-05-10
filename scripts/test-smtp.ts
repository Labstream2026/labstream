/**
 * Test SMTP — verifica conexión y manda email de prueba.
 *
 * USO:
 *   1. En tu .env local pon las variables SMTP_* con tu NUEVA password
 *   2. Corre: npx tsx scripts/test-smtp.ts tu-correo-personal@gmail.com
 *
 * Reporta:
 *   - ¿Conecta al servidor?
 *   - ¿Autentica con user/pass?
 *   - ¿Llega el email?
 *
 * No usa la lib de la webapp directamente — habla SMTP raw para que veas
 * exactamente qué responde el servidor.
 */

import nodemailer from "nodemailer";

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error("Uso: npx tsx scripts/test-smtp.ts tu-correo@dominio.com");
    process.exit(1);
  }

  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false",
    from: process.env.EMAIL_FROM ?? "Labstream <labstream@labstreamsas.com>",
  };

  console.log("\n┌─ Configuración leída de .env ────────────");
  console.log(`│ SMTP_HOST:                       ${config.host}`);
  console.log(`│ SMTP_PORT:                       ${config.port}`);
  console.log(`│ SMTP_SECURE (SSL implícito):     ${config.secure}`);
  console.log(`│ SMTP_USER:                       ${config.user}`);
  console.log(`│ SMTP_PASS:                       ${config.pass ? "[" + config.pass.length + " chars]" : "(no set)"}`);
  console.log(`│ SMTP_TLS_REJECT_UNAUTHORIZED:    ${config.rejectUnauthorized}`);
  console.log(`│ EMAIL_FROM:                      ${config.from}`);
  console.log(`│ Destino de prueba:               ${to}`);
  console.log("└──────────────────────────────────────────\n");

  if (!config.host || !config.user || !config.pass) {
    console.error("✗ Falta SMTP_HOST, SMTP_USER o SMTP_PASS en tu .env\n");
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    tls: { rejectUnauthorized: config.rejectUnauthorized },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
    logger: true,    // imprime el diálogo SMTP completo
    debug: true,
  });

  console.log("→ Verificando conexión y autenticación...\n");
  try {
    await transporter.verify();
    console.log("\n✓ Conexión y autenticación OK\n");
  } catch (e) {
    console.error("\n✗ Verify falló:", e instanceof Error ? e.message : e);
    console.error("\nPosibles causas:");
    console.error("  - Usuario/contraseña incorrectos");
    console.error("  - Puerto bloqueado en el firewall del NAS o de tu ISP");
    console.error("  - Cert TLS self-signed → prueba con SMTP_TLS_REJECT_UNAUTHORIZED=false");
    console.error("  - Si el NAS pide app-password, créala en MailPlus settings\n");
    process.exit(1);
  }

  console.log("→ Enviando email de prueba a", to, "...\n");
  try {
    const info = await transporter.sendMail({
      from: config.from,
      to,
      subject: "Test SMTP · Labstream Studio",
      html: `
        <div style="font-family:Arial,sans-serif;background:#0f0f0f;color:#f0f0ee;padding:24px;border-radius:12px;max-width:520px;margin:0 auto">
          <h2 style="font-style:italic;font-size:24px;margin:0 0 12px;color:#fff">Test exitoso</h2>
          <p style="font-size:14px;color:rgba(255,255,255,0.85)">
            Este email fue enviado desde tu servidor SMTP en
            <code style="color:#E8640C">${config.host}:${config.port}</code> a través de la
            cuenta <code style="color:#E8640C">${config.user}</code>.
          </p>
          <p style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:20px">
            Si lo ves, todo está funcionando ✓
          </p>
        </div>
      `,
    });
    console.log("\n✓ Email enviado");
    console.log("  messageId:", info.messageId);
    console.log("  response:", info.response);
    console.log("\nRevisa la bandeja de", to, "(y la carpeta de spam por si acaso)\n");
  } catch (e) {
    console.error("\n✗ Envío falló:", e instanceof Error ? e.message : e);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
