
import { BufferJSON } from "@whiskeysockets/baileys/lib/Utils/generics.js";
import { initAuthCreds } from "@whiskeysockets/baileys/lib/Utils/auth-utils.js";

const API_URL = process.env.WHATSAPP_SESSION_API_URL;
const SERVICE_SECRET = process.env.WHATSAPP_SERVICE_SECRET;

if (!API_URL || !SERVICE_SECRET) {
  throw new Error("Configuração da API de sessão ausente.");
}

const BASE_URL = API_URL.replace(/\/+$/, "");

async function requisicao(caminho, options = {}) {
  const response = await fetch(`${BASE_URL}${caminho}`, {
    ...options,
    headers: {
      authorization: `Bearer ${SERVICE_SECRET}`,
      "content-type": "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`API de sessão respondeu HTTP ${response.status}.`);
  }

  return response.json();
}

function serializar(valor) {
  return JSON.stringify(valor, BufferJSON.replacer);
}

function desserializar(valor) {
  const texto =
    typeof valor === "string" ? valor : JSON.stringify(valor);

  return JSON.parse(texto, BufferJSON.reviver);
}

export async function criarEstadoAutenticacao() {
  const resposta = await requisicao("?resource=creds");

  const creds = resposta.value
    ? desserializar(resposta.value)
    : initAuthCreds();

async function salvarCredenciais(atualizacao = {}) {
  Object.assign(creds, atualizacao);

  await requisicao("", {
    method: "POST",
    body: JSON.stringify({
      resource: "creds",
      value: JSON.parse(serializar(creds)),
    }),
  });
}

  const keys = {
    async get(type, ids) {
      if (!Array.isArray(ids) || ids.length > 100) {
        throw new Error("Consulta de chaves inválida.");
      }

      if (ids.length === 0) return {};

      const params = new URLSearchParams({
        resource: "keys",
        type,
      });

      for (const id of ids) {
        params.append("id", id);
      }

      const resposta = await requisicao(`?${params.toString()}`);
      const resultado = {};

      for (const [id, valor] of Object.entries(resposta.value || {})) {
        resultado[id] = desserializar(valor);
      }

      return resultado;
    },

    async set(data) {
      const values = {};

      for (const [type, entries] of Object.entries(data)) {
        values[type] = {};

        for (const [id, value] of Object.entries(entries || {})) {
          values[type][id] =
            value === null ? null : JSON.parse(serializar(value));
        }
      }

      await requisicao("", {
        method: "POST",
        body: JSON.stringify({
          resource: "keys",
          values,
        }),
      });
    },

    async clear() {
      await requisicao("", {
        method: "DELETE",
      });
    },
  };

  return {
    state: {
      creds,
      keys,
    },
    saveCreds: salvarCredenciais,
  };
}

export async function limparEstadoAutenticacao() {
  await requisicao("", {
    method: "DELETE",
  });
}
