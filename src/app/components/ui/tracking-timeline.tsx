
"use client";

import { motion } from "framer-motion";
import { Check, Circle, CircleDot } from "lucide-react";

export type EventoTimeline = {
  toStatus: string;
  createdAt: string;
  source: string;
};

type TrackingTimelineProps = {
  fulfillmentStatus: string;
  paymentStatus: string;
  statusHistory: EventoTimeline[];
};

const etapas = [
  { id: "pending", titulo: "Pedido confirmado" },
  { id: "preparing", titulo: "Em preparação" },
  { id: "ready", titulo: "Pedido pronto" },
  { id: "shipped", titulo: "Pedido enviado" },
  { id: "delivered", titulo: "Pedido entregue" },
];

export default function TrackingTimeline({
  fulfillmentStatus,
  paymentStatus,
  statusHistory,
}: TrackingTimelineProps) {
  const pagamentoConfirmado = paymentStatus === "paid";

const dataPagamento = [...statusHistory].reverse().find(
  (evento) =>
    evento.toStatus === "paid" &&
    ["payment_confirmation", "stripe_webhook"].includes(evento.source)
)?.createdAt;

  const historicoEntrega = statusHistory
    .filter((evento) => evento.source === "admin")
    .reduce<Record<string, string>>((resultado, evento) => {
      resultado[evento.toStatus] = evento.createdAt;
      return resultado;
    }, {});

  const indiceAtual = pagamentoConfirmado
    ? etapas.findIndex((etapa) => etapa.id === fulfillmentStatus)
    : -1;

  return (
    <ol className="relative ml-4">
      {etapas.map((etapa, index) => {
        const concluida =
          pagamentoConfirmado && indiceAtual >= 0 && index <= indiceAtual;

        const atual =
          pagamentoConfirmado && index === indiceAtual;

        const data =
          index === 0 ? dataPagamento : historicoEntrega[etapa.id];

        return (
          <motion.li
            key={etapa.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.12, duration: 0.3 }}
            className="relative flex gap-5 pb-9 last:pb-0"
            aria-current={atual ? "step" : undefined}
          >
            {index !== etapas.length - 1 && (
              <span
                className={`absolute left-[15px] top-8 h-full w-0.5 ${
                  concluida && index < indiceAtual
                    ? "bg-black"
                    : "bg-gray-200"
                }`}
              />
            )}

            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                concluida
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {atual && (
                <motion.span
                  className="absolute inset-0 rounded-full bg-gray-400"
                  animate={{
                    scale: [1, 1.45, 1],
                    opacity: [0.35, 0, 0.35],
                  }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                />
              )}

                {atual ? (
                <CircleDot size={17} />
                ) : concluida ? (
                <Check size={16} />
                ) : (
                <Circle size={15} />
                )}
            </span>

            <div className="min-w-0 pt-1">
              <p
                className={`text-sm font-bold ${
                  concluida ? "text-black" : "text-gray-400"
                }`}
              >
                {etapa.titulo}
              </p>

              {data && concluida && (
                <time
                  dateTime={data}
                  className="mt-1 block text-xs text-gray-500"
                >
                  {new Date(data).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              )}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
