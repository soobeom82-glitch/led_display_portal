import type { DisplayPayload } from "@/lib/types";

function getStatusTone(payload: DisplayPayload) {
  if (payload.tesla.complete) {
    return {
      badge: "border-emerald-400/30 bg-emerald-400/12 text-emerald-300",
      glow: "shadow-[0_0_40px_rgba(52,211,153,0.18)]",
      primary: "text-emerald-300",
      secondary: "text-emerald-100",
    };
  }

  if (payload.tesla.charging) {
    return {
      badge: "border-sky-400/30 bg-sky-400/12 text-sky-300",
      glow: "shadow-[0_0_40px_rgba(56,189,248,0.16)]",
      primary: "text-sky-300",
      secondary: "text-white",
    };
  }

  return {
    badge: "border-amber-300/25 bg-amber-300/10 text-amber-200",
    glow: "shadow-[0_0_40px_rgba(251,191,36,0.14)]",
    primary: "text-amber-200",
    secondary: "text-white",
  };
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-t border-white/8 py-3 text-sm text-white/58">
      <span>{label}</span>
      <span className="font-mono text-white/88">{value}</span>
    </div>
  );
}

export function DisplayBoard({ payload }: { payload: DisplayPayload }) {
  const tone = getStatusTone(payload);

  return (
    <section
      className={`relative display-board display-glow overflow-hidden rounded-[32px] border border-white/10 p-5 text-[var(--panel-foreground)] sm:p-8 ${tone.glow}`}
    >
      <div className="absolute inset-0 opacity-70">
        <div className="fine-grid h-full w-full" />
      </div>

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/45 sm:text-xs sm:tracking-[0.32em]">
            Ambient Preview
          </p>
          <p className="mt-3 font-mono text-[3.6rem] font-semibold leading-none tracking-tight text-white sm:mt-4 sm:text-[4.8rem]">
            {payload.time}
          </p>
        </div>

        <div
          className={`rounded-full border px-3 py-1 font-mono text-[11px] ${tone.badge} sm:text-xs`}
        >
          {payload.timezone}
        </div>
      </div>

      <div className="relative mt-10 space-y-4 sm:mt-14 sm:space-y-5">
        <p className={`font-mono text-[2.9rem] font-semibold leading-none sm:text-[4rem] ${tone.primary}`}>
          {payload.tesla.battery === null
            ? "🔋--%"
            : `🔋${payload.tesla.battery}%`}
        </p>
        <p className={`text-[2.2rem] font-semibold leading-none sm:text-[2.8rem] ${tone.secondary}`}>
          {payload.tesla.status}
        </p>
        <p className="font-mono text-[2.35rem] text-white/92 sm:text-[3.1rem]">
          {payload.tesla.minutesRemaining === null
            ? payload.tesla.complete
              ? "Ready"
              : "-- min"
            : `${payload.tesla.minutesRemaining} min`}
        </p>
      </div>

      <div className="relative mt-10 rounded-[24px] border border-white/10 bg-white/[0.06] px-4 py-2 backdrop-blur-sm sm:mt-14">
        <DetailRow
          label="Charging"
          value={payload.tesla.charging ? "true" : "false"}
        />
        <DetailRow
          label="Charge limit"
          value={payload.tesla.limit === null ? "--%" : `${payload.tesla.limit}%`}
        />
        <DetailRow
          label="Vehicle"
          value={payload.tesla.vehicleName ?? "Unknown"}
        />
        <DetailRow label="Source" value={payload.meta.source} />
      </div>
    </section>
  );
}
