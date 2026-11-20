import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import prisma from "@/src/lib/prisma";

const JANELA_MS = 10 * 60 * 1000;
const LIMITE_USUARIO = 5;
const LIMITE_IP = 15;

type ResultadoContagem = {
  count: number;
  windowStartedAt: Date;
};

function gerarChave(tipo: "user" | "ip", valor: string) {
  const secret = process.env.RATE_LIMIT_SECRET;

  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("RATE_LIMIT_SECRET ausente ou inválida.");
  }

  const hash = createHmac("sha256", secret)
    .update(`${tipo}:${valor}`)
    .digest("hex");

  return `${tipo}:${hash}`;
}

function obterIP(request: Request) {
  const ip = request.headers.get("x-real-ip")?.trim();

  if (ip && isIP(ip)) return ip;

  if (process.env.NODE_ENV !== "production") {
    return "127.0.0.1";
  }

  throw new Error("Nao foi possivel identificar o IP da requisicao.");
}

async function incrementarContador(key: string) {
  const rows = await prisma.$queryRaw<ResultadoContagem[]>`
    INSERT INTO "CheckoutRateLimit" ("key", "count", "windowStartedAt")
    VALUES (${key}, 1, NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "CheckoutRateLimit"."windowStartedAt"
          <= NOW() - INTERVAL '10 minutes'
        THEN 1
        ELSE "CheckoutRateLimit"."count" + 1
      END,
      "windowStartedAt" = CASE
        WHEN "CheckoutRateLimit"."windowStartedAt"
          <= NOW() - INTERVAL '10 minutes'
        THEN NOW()
        ELSE "CheckoutRateLimit"."windowStartedAt"
      END
    RETURNING "count", "windowStartedAt"
  `;

  if (!rows[0]) {
    throw new Error("Não foi possível atualizar o contador.");
  }

  return rows[0];
}

function calcularEspera(inicio: Date) {
  return Math.max(
    1,
    Math.ceil((inicio.getTime() + JANELA_MS - Date.now()) / 1000)
  );
}

export async function verificarRateLimitCheckout(
  request: Request,
  userId: string
) {
  const ip = obterIP(request);

  const chaveUsuario = gerarChave("user", userId);
  const chaveIP = gerarChave("ip", ip);

  const usuario = await incrementarContador(chaveUsuario);
  const endereco = await incrementarContador(chaveIP);

  if (Math.random() < 0.01) {
    try {
      await prisma.$executeRaw`
        DELETE FROM "CheckoutRateLimit"
        WHERE "windowStartedAt" < NOW() - INTERVAL '1 day'
      `;
    } catch {
      // A limpeza é secundária; a contagem já foi registrada.
    }
  }

  const bloqueios = [];

  if (usuario.count > LIMITE_USUARIO) {
    bloqueios.push(calcularEspera(usuario.windowStartedAt));
  }

  if (endereco.count > LIMITE_IP) {
    bloqueios.push(calcularEspera(endereco.windowStartedAt));
  }

  return {
    allowed: bloqueios.length === 0,
    retryAfterSeconds: bloqueios.length
      ? Math.max(...bloqueios)
      : 0,
  };
}
