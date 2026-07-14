import { DisplayAutoRefresh } from "@/components/display-auto-refresh";
import { DisplayBoard } from "@/components/display-board";
import { getDisplayPayload } from "@/lib/display";
import { getAppEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function DisplayPage({
  searchParams,
}: {
  searchParams: Promise<{ oauth?: string; error?: string }>;
}) {
  const params = await searchParams;
  const payload = await getDisplayPayload();
  const env = getAppEnv();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <DisplayAutoRefresh seconds={env.displayPollSeconds} />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,245,234,0.9),transparent_32%),linear-gradient(180deg,#f8f3ec_0%,#efe6da_50%,#e3d2c0_100%)]" />
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6">
        {params.oauth === "connected" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/85 px-4 py-3 text-sm text-emerald-800">
            Tesla OAuth connected. Refresh token is now available to the display
            service.
          </div>
        ) : null}

        {params.error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/85 px-4 py-3 text-sm text-rose-700">
            Tesla OAuth error: {params.error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <DisplayBoard payload={payload} />

          <aside className="ambient-shell rounded-[28px] border border-[var(--border)] p-6">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-black/40">
              Display Notes
            </p>
            <div className="mt-4 space-y-4 text-sm leading-7 text-black/70">
              <p>
                이 페이지는 LED 디스플레이를 대신하는 브라우저 미리보기입니다.
                새로고침 없이 {env.displayPollSeconds}초마다 서버 데이터를 다시
                불러옵니다.
              </p>
              <p>
                `ESP32`는 동일한 `/api/display` JSON을 해석하면 되고, 표시
                로직은 이 페이지와 같게 유지하면 됩니다.
              </p>
              <p>
                Source:{" "}
                <span className="font-mono">
                  {payload.meta.usingMock ? "mock" : "tesla-live"}
                </span>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
