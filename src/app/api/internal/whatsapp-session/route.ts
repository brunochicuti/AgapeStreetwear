
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import prisma from "../../../../lib/prisma";

const TIPOS_PERMITIDOS = new Set([
  "pre-key",
  "session",
  "sender-key",
  "sender-key-memory",
  "app-state-sync-key",
  "app-state-sync-version",
  "lid-mapping",
  "device-list",
  "tctoken",
  "identity-key",
]);

function obterConfiguracao() {
  const secret = process.env.WHATSAPP_SERVICE_SECRET;
  const encryptionKey = process.env.WHATSAPP_SESSION_ENCRYPTION_KEY;

  if (!secret || secret.length < 40) {
    throw new Error("WHATSAPP_SERVICE_SECRET não configurado.");
  }

  if (!encryptionKey) {
    throw new Error("Chave de criptografia não configurada.");
  }

  const key = Buffer.from(encryptionKey, "base64");

  if (key.length !== 32) {
    throw new Error("Chave de criptografia inválida.");
  }

  return { secret, key };
}

function autorizado(request: NextRequest, secret: string) {
  const recebido = Buffer.from(
    request.headers.get("authorization") || ""
  );

  const esperado = Buffer.from(`Bearer ${secret}`);

  return (
    recebido.length === esperado.length &&
    crypto.timingSafeEqual(recebido, esperado)
  );
}

function criptografar(valor: unknown, key: Buffer) {
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    key,
    iv
  );

  const texto = JSON.stringify(valor);

  const encrypted = Buffer.concat([
    cipher.update(texto, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

function descriptografar(valor: string, key: Buffer) {
  const partes = valor.split(":");

  if (partes.length !== 4 || partes[0] !== "v1") {
    throw new Error("Formato de sessão inválido.");
  }

  const iv = Buffer.from(partes[1], "base64");
  const tag = Buffer.from(partes[2], "base64");
  const encrypted = Buffer.from(partes[3], "base64");

  if (iv.length !== 12 || tag.length !== 16) {
    throw new Error("Dados criptográficos inválidos.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    iv
  );

  decipher.setAuthTag(tag);

  const texto = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(texto);
}

async function verificar(request: NextRequest) {
  const { secret, key } = obterConfiguracao();

  if (!autorizado(request, secret)) {
    return null;
  }

  return key;
}

export async function GET(request: NextRequest) {
  try {
    const key = await verificar(request);

    if (!key) {
      return NextResponse.json(
        { error: "Não autorizado." },
        { status: 401 }
      );
    }

    const params = request.nextUrl.searchParams;
    const resource = params.get("resource");

    if (resource === "creds") {
      const registro = await prisma.whatsAppSession.findUnique({
        where: { id: "baileys" },
      });

      return NextResponse.json({
        value: registro
          ? descriptografar(registro.encryptedCreds, key)
          : null,
      });
    }

    if (resource === "keys") {
      const type = params.get("type");
      const ids = params.getAll("id");

      if (
        !type ||
        !TIPOS_PERMITIDOS.has(type) ||
        ids.length > 100 ||
        ids.some((id) => !id || id.length > 500)
      ) {
        return NextResponse.json(
          { error: "Consulta de chaves inválida." },
          { status: 400 }
        );
      }

      if (ids.length === 0) {
        return NextResponse.json({ value: {} });
      }

      const registros = await prisma.whatsAppSessionKey.findMany({
        where: {
          keyType: type,
          keyId: { in: ids },
        },
      });

      const value: Record<string, unknown> = {};

      for (const registro of registros) {
        value[registro.keyId] = descriptografar(
          registro.encryptedData,
          key
        );
      }

      return NextResponse.json({ value });
    }

    return NextResponse.json(
      { error: "Recurso inválido." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "Não foi possível consultar a sessão." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const key = await verificar(request);

    if (!key) {
      return NextResponse.json(
        { error: "Não autorizado." },
        { status: 401 }
      );
    }

    const texto = await request.text();

    if (Buffer.byteLength(texto, "utf8") > 1_000_000) {
      return NextResponse.json(
        { error: "Dados muito grandes." },
        { status: 413 }
      );
    }

    const body = JSON.parse(texto);

    if (body?.resource === "creds") {
      if (
        !body.value ||
        typeof body.value !== "object" ||
        Array.isArray(body.value)
      ) {
        return NextResponse.json(
          { error: "Credenciais inválidas." },
          { status: 400 }
        );
      }

      await prisma.whatsAppSession.upsert({
        where: { id: "baileys" },
        create: {
          id: "baileys",
          encryptedCreds: criptografar(body.value, key),
        },
        update: {
          encryptedCreds: criptografar(body.value, key),
        },
      });

      return NextResponse.json({ status: "saved" });
    }

    if (body?.resource === "keys") {
      const values = body.values;

      if (
        !values ||
        typeof values !== "object" ||
        Array.isArray(values)
      ) {
        return NextResponse.json(
          { error: "Chaves inválidas." },
          { status: 400 }
        );
      }

      const tipos = Object.keys(values);

      if (
        tipos.length > TIPOS_PERMITIDOS.size ||
        tipos.some((type) => !TIPOS_PERMITIDOS.has(type))
      ) {
        return NextResponse.json(
          { error: "Tipo de chave inválido." },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        for (const type of tipos) {
          const entries = values[type];

          if (
            !entries ||
            typeof entries !== "object" ||
            Array.isArray(entries) ||
            Object.keys(entries).length > 100
          ) {
            throw new Error("Conjunto de chaves inválido.");
          }

          for (const [id, value] of Object.entries(entries)) {
            if (!id || id.length > 500) {
              throw new Error("Identificador inválido.");
            }

            if (value === null) {
              await tx.whatsAppSessionKey.deleteMany({
                where: { keyType: type, keyId: id },
              });

              continue;
            }

            const encryptedData = criptografar(value, key);

            await tx.whatsAppSessionKey.upsert({
              where: {
                keyType_keyId: {
                  keyType: type,
                  keyId: id,
                },
              },
              create: {
                keyType: type,
                keyId: id,
                encryptedData,
              },
              update: { encryptedData },
            });
          }
        }
      });

      return NextResponse.json({ status: "saved" });
    }

    return NextResponse.json(
      { error: "Recurso inválido." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "Não foi possível salvar a sessão." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const key = await verificar(request);

    if (!key) {
      return NextResponse.json(
        { error: "Não autorizado." },
        { status: 401 }
      );
    }

    await prisma.$transaction([
      prisma.whatsAppSession.deleteMany({
        where: { id: "baileys" },
      }),
      prisma.whatsAppSessionKey.deleteMany(),
    ]);

    return NextResponse.json({ status: "cleared" });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível limpar a sessão." },
      { status: 500 }
    );
  }
}
