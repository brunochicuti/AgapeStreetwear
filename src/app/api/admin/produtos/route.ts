
import { connection } from "next/server";
import { stripe } from "@/src/lib/stripe";
import { verificarAdmin } from "@/src/lib/admin";

export async function GET() {
  await connection();

  try {
    if (!(await verificarAdmin())) {
      return Response.json(
        { error: "Acesso não autorizado." },
        { status: 403 }
      );
    }

    const produtos = [];
    let startingAfter: string | undefined;

    while (true) {
      const pagina = await stripe.products.list({
        active: undefined,
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });

      produtos.push(
        ...pagina.data.map((produto) => ({
          id: produto.id,
          name: produto.name,
          image: produto.images[0] || "",
        }))
      );

      if (!pagina.has_more || pagina.data.length === 0) {
        break;
      }

      startingAfter = pagina.data[pagina.data.length - 1].id;
    }

    return Response.json(
      { products: produtos },
      {
        headers: {
          "Cache-Control": "no-store, private",
        },
      }
    );
  } catch (error) {
    console.error("Erro ao consultar produtos administrativos:", error);

    return Response.json(
      { error: "Não foi possível consultar os produtos." },
      { status: 500 }
    );
  }
}
