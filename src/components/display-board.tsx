import type { DisplayPayload } from "@/lib/types";

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
      <span className="font-mono text-white/78">{value}</span>
    </div>
  );
}

export function DisplayBoard({ payload }: { payload: DisplayPayload }) {
  return (
    <section className="display-board display-glow fine-grid overflow-hidden rounded-[32px] border border-white/8 p-6 text-[var(--panel-foreground)] sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-white/42">
            Ambient Preview
          </p>
          <p className="mt-4 font-mono text-[3.4rem] font-semibold leading-none tracking-tight sm:text-[4.6rem]">
            {payload.time}
          </p>
        </div>

        <div className="rounded-full border border-white/10 bg-white/7 px-3 py-1 font-mono text-xs text-white/62">
          {payload.timezone}
        </div>
      </div>

      <div className="mt-12 space-y-5 sm:mt-16">
        <p className="font-mono text-[2.5rem] font-semibold leading-none sm:text-[3.8rem]">
          {payload.tesla.battery === null
            ? "🔋--%"
            : `🔋${payload.tesla.battery}%`}
        </p>
        <p className="text-[2rem] font-medium leading-none sm:text-[2.6rem]">
          {payload.tesla.status}
        </p>
        <p className="font-mono text-[2.15rem] text-white/80 sm:text-[3rem]">
          {payload.tesla.minutesRemaining === null
            ? payload.tesla.complete
              ? "Ready"
              : "-- min"
            : `${payload.tesla.minutesRemaining} min`}
        </p>
      </div>

      <div className="mt-12 rounded-[24px] border border-white/10 bg-black/18 px-4 py-2 sm:mt-16">
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
