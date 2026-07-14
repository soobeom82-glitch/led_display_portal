import Link from "next/link";
import { getAppEnv } from "@/lib/env";
import { getDisplayPayload } from "@/lib/display";

export const dynamic = "force-dynamic";

function StatusPill({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
          : "bg-black/5 text-black/60"
      }`}
    >
      {label}
    </span>
  );
}

export default async function Home() {
  const env = getAppEnv();
  const payload = await getDisplayPayload();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-10 px-6 py-10 sm:px-8 lg:px-10">
      <section className="ambient-shell overflow-hidden rounded-[32px] border border-[var(--border)] p-8 shadow-[0_24px_80px_rgba(65,44,22,0.08)] sm:p-10">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-7">
            <div className="space-y-4">
              <p className="font-mono text-sm uppercase tracking-[0.32em] text-black/45">
                Tesla Personal Display
              </p>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-black sm:text-5xl">
                  Tesla 상태만 먼저 정확하게 보여주는 Ambient Display MVP
                </h1>
                <p className="max-w-2xl text-base leading-7 text-black/68 sm:text-lg">
                  `ESP32 → HTTPS(JSON) → Vercel` 구조로 유지하고, 모든
                  비즈니스 로직은 Next.js Route Handler에 두는 첫 버전입니다.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <StatusPill
                label={
                  env.isTeslaOauthConfigured
                    ? "Tesla OAuth ready"
                    : "Tesla OAuth pending"
                }
                active={env.isTeslaOauthConfigured}
              />
              <StatusPill
                label={
                  payload.meta.source === "tesla-live"
                    ? "Live Tesla active"
                    : "Tesla data pending"
                }
                active={payload.meta.source === "tesla-live"}
              />
              <StatusPill
                label={
                  payload.meta.message?.includes("must be registered")
                    ? "Partner registration required"
                    : "Partner registration clear"
                }
                active={!payload.meta.message?.includes("must be registered")}
              />
              <StatusPill
                label={`Poll ${env.displayPollSeconds}s`}
                active={true}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/display"
                className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              >
                Open Browser Display
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-black/10 bg-white/70 px-5 py-3 text-sm font-semibold text-black transition-transform hover:-translate-y-0.5"
              >
                Start Tesla Login
              </Link>
              <Link
                href="/api/tesla/register?redirect=/display"
                className="rounded-full border border-black/10 bg-white/70 px-5 py-3 text-sm font-semibold text-black transition-transform hover:-translate-y-0.5"
              >
                Register Tesla Partner
              </Link>
              <Link
                href="/api/display"
                className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold text-black/70 transition-transform hover:-translate-y-0.5 hover:bg-white/60"
              >
                View Display JSON
              </Link>
            </div>
          </div>

          <div className="display-board display-glow fine-grid flex min-h-[320px] flex-col justify-between rounded-[28px] border border-white/8 p-6 text-[var(--panel-foreground)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-white/45">
                  Live Preview
                </p>
                <p className="mt-3 font-mono text-5xl font-semibold tracking-tight">
                  {payload.time}
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 font-mono text-xs text-white/65">
                {payload.timezone}
              </div>
            </div>

            <div className="space-y-3">
              <p className="font-mono text-4xl font-semibold">
                {payload.tesla.battery === null
                  ? "🔋--%"
                  : `🔋${payload.tesla.battery}%`}
              </p>
              <p className="text-2xl font-medium">{payload.tesla.status}</p>
              <p className="font-mono text-3xl text-white/82">
                {payload.tesla.minutesRemaining === null
                  ? payload.tesla.complete
                    ? "Ready"
                    : "-- min"
                  : `${payload.tesla.minutesRemaining} min`}
              </p>
            </div>

            <div className="flex items-end justify-between text-sm text-white/55">
              <span>{payload.tesla.vehicleName ?? "Tesla vehicle"}</span>
              <span>Limit {payload.tesla.limit ?? "--"}%</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          {
            title: "/login",
            description:
              "Tesla OAuth 시작점입니다. state cookie를 만든 뒤 Tesla 로그인으로 바로 리다이렉트합니다.",
          },
          {
            title: "/api/tesla/callback",
            description:
              "Authorization code를 access/refresh token으로 교환하고 저장소에 refresh token을 보관합니다.",
          },
          {
            title: "/api/display",
            description:
              "ESP32와 브라우저가 함께 쓰는 단일 JSON API입니다. MVP 단계에서는 이 응답만 맞추면 됩니다.",
          },
        ].map((item) => (
          <article
            key={item.title}
            className="ambient-shell rounded-[24px] border border-[var(--border)] p-6"
          >
            <p className="font-mono text-sm text-black/45">{item.title}</p>
            <p className="mt-3 text-base leading-7 text-black/70">
              {item.description}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <article className="ambient-shell rounded-[24px] border border-[var(--border)] p-6">
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-black/45">
            Current Output
          </p>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-black px-4 py-4 font-mono text-xs leading-6 text-white">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </article>

        <article className="ambient-shell rounded-[24px] border border-[var(--border)] p-6">
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-black/45">
            Next Steps
          </p>
          <ol className="mt-4 space-y-4 text-sm leading-7 text-black/72">
            <li>
              1. Tesla Developer Portal에서 OAuth app을 만들고
              `.env.local`에 client id, secret, redirect URI를 채웁니다.
            </li>
            <li>
              2. Vercel에 배포할 때는 `DISPLAY_API_KEY`를 함께 넣어 ESP32
              polling endpoint를 보호합니다.
            </li>
            <li>
              3. 로컬에서는 파일 기반 토큰 저장을 쓰고, Vercel에서는 KV 또는
              `TESLA_REFRESH_TOKEN` 환경변수 fallback을 선택할 수 있습니다.
            </li>
            <li>
              4. 등록되지 않은 계정이면 `Register Tesla Partner`로 one-time
              partner registration을 먼저 실행합니다.
            </li>
          </ol>
        </article>
      </section>
    </main>
  );
}
