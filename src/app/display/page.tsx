import Link from "next/link";
import { DisplayBoard } from "@/components/display-board";
import { getDisplayPayload } from "@/lib/display";

export const dynamic = "force-dynamic";

export default async function DisplayPage({
  searchParams,
}: {
  searchParams: Promise<{
    oauth?: string;
    error?: string;
    registered?: string;
    wake?: string;
    vehicle?: string;
  }>;
}) {
  const params = await searchParams;
  const payload = await getDisplayPayload();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,164,106,0.24),transparent_24%),radial-gradient(circle_at_bottom,rgba(255,120,68,0.12),transparent_30%),linear-gradient(180deg,#120f14_0%,#1e1716_48%,#2c2018_100%)]" />
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6">
        {params.oauth === "connected" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/85 px-4 py-3 text-sm text-emerald-800">
            Tesla OAuth connected. Refresh token is now available to the display
            service.
          </div>
        ) : null}

        {params.registered === "connected" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/85 px-4 py-3 text-sm text-emerald-800">
            Tesla partner account registered. The app can now call Fleet API
            endpoints for this region.
          </div>
        ) : null}

        {params.wake === "sent" ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-sm text-sky-800">
            Wake request sent to {params.vehicle ?? "your Tesla"}. The vehicle
            may take 10-60 seconds to come online, so refresh once after a
            short wait.
          </div>
        ) : null}

        {params.error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/85 px-4 py-3 text-sm text-rose-700">
            Tesla OAuth error: {params.error}
          </div>
        ) : null}

        {!params.error && payload.meta.message ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/85 px-4 py-3 text-sm text-amber-800">
            Tesla status: {payload.meta.message}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <DisplayBoard payload={payload} />

          <aside className="rounded-[28px] border border-white/10 bg-white/8 p-6 text-white/88 backdrop-blur-md">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-white/45">
              Display Notes
            </p>
            <div className="mt-4 space-y-4 text-sm leading-7 text-white/72">
              <p>
                이 페이지는 LED 디스플레이를 대신하는 브라우저 미리보기입니다.
                현재 서버 상태를 한 번 렌더링하며, 필요할 때 브라우저를 직접
                새로고침하면 됩니다.
              </p>
              <p>
                `ESP32`는 동일한 `/api/display` JSON을 주기적으로 호출하면
                되고, 표시 로직은 이 페이지와 같게 유지하면 됩니다.
              </p>
              <p>
                Source:{" "}
                <span className="font-mono">{payload.meta.source}</span>
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/api/tesla/wake?redirect=/display"
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-white/15"
              >
                Wake Vehicle
              </Link>
              <Link
                href="/display"
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/72 transition-transform hover:-translate-y-0.5 hover:bg-white/8"
              >
                Refresh View
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
