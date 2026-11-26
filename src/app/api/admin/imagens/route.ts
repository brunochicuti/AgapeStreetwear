
import { connection } from "next/server";
import { cloudinary } from "@/src/lib/cloudinary";
import prisma from "@/src/lib/prisma";
import { verificarAdmin } from "@/src/lib/admin";
import type { UploadApiResponse } from "cloudinary";

const ANGULOS = ["FRENTE", "LADO", "COSTAS"] as const;
const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO = 5 * 1024 * 1024;

function enviarParaCloudinary(
  buffer: Buffer,
  publicId: string
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: "agape/produtos",
          public_id: publicId,
          overwrite: true,
          invalidate: true,
          transformation: [
            {
              width: 1600,
              height: 1600,
              crop: "limit",
              quality: "auto",
              fetch_format: "auto",
            },
          ],
        },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error("Falha no upload."));
            return;
          }

          resolve(result);
        }
      )
      .end(buffer);
  });
}

export async function POST(request: Request) {
  await connection();

  try {
    if (!(await verificarAdmin())) {
      return Response.json(
        { error: "Acesso não autorizado." },
        { status: 403 }
      );
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return Response.json(
        { error: "Configuração do Cloudinary incompleta." },
        { status: 500 }
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    const formData = await request.formData();

    const stripeProductId = formData.get("stripeProductId");
    const angle = formData.get("angle");
    const file = formData.get("file");

    if (
      typeof stripeProductId !== "string" ||
      !/^prod_[A-Za-z0-9]+$/.test(stripeProductId)
    ) {
      return Response.json(
        { error: "Identificador do produto inválido." },
        { status: 400 }
      );
    }

    if (
      typeof angle !== "string" ||
      !ANGULOS.includes(angle as (typeof ANGULOS)[number])
    ) {
      return Response.json(
        { error: "Ângulo da imagem inválido." },
        { status: 400 }
      );
    }

    if (!(file instanceof File) || file.size === 0) {
      return Response.json(
        { error: "Selecione uma imagem válida." },
        { status: 400 }
      );
    }

    if (file.size > TAMANHO_MAXIMO) {
      return Response.json(
        { error: "A imagem não pode ultrapassar 5 MB." },
        { status: 400 }
      );
    }

    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      return Response.json(
        { error: "Formato não permitido. Use JPG, PNG ou WebP." },
        { status: 400 }
      );
    }

    const publicId = `${stripeProductId}_${angle.toLowerCase()}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const uploaded = await enviarParaCloudinary(buffer, publicId);

    const imagem = await prisma.productImage.upsert({
      where: {
        stripeProductId_angle: {
          stripeProductId,
          angle: angle as (typeof ANGULOS)[number],
        },
      },
      create: {
        stripeProductId,
        angle: angle as (typeof ANGULOS)[number],
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
      },
      update: {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
      },
    });

    return Response.json({ success: true, image: imagem });
  } catch (error) {
    console.error("Erro no upload de imagem:", error);

    return Response.json(
      { error: "Não foi possível enviar a imagem." },
      { status: 500 }
    );
  }
}


export async function GET() {
  await connection();

  try {
    if (!(await verificarAdmin())) {
      return Response.json(
        { error: "Acesso não autorizado." },
        { status: 403 }
      );
    }

    const imagens = await prisma.productImage.findMany({
      orderBy: {
        updatedAt: "desc",
      },
    });

    return Response.json(
      { images: imagens },
      {
        headers: {
          "Cache-Control": "no-store, private",
        },
      }
    );
  } catch (error) {
    console.error("Erro ao consultar imagens administrativas:", error);

    return Response.json(
      { error: "Não foi possível consultar as imagens." },
      { status: 500 }
    );
  }
}

