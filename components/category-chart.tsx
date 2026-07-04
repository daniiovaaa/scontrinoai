"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  data: Array<{ category: string; total: number }>;
}

const eur = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

export function CategoryChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        Il grafico apparirà dopo il primo scontrino
      </div>
    );
  }

  return (
    <div className="h-64 w-full rounded-xl border bg-card p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#222736"
          />
          <XAxis
            dataKey="category"
            tick={{ fontSize: 12, fill: "#98a1b3" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#98a1b3" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `€${v}`}
            width={56}
          />
          <Tooltip
            formatter={(value) => [eur.format(Number(value)), "Totale"]}
            cursor={{ fill: "rgba(245, 158, 11, 0.06)" }}
            contentStyle={{
              backgroundColor: "#12151d",
              border: "1px solid #222736",
              borderRadius: "10px",
              color: "#e6e8ee",
            }}
            labelStyle={{ color: "#98a1b3" }}
          />
          <Bar dataKey="total" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={64} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}