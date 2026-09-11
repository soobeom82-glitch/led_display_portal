import Link from "next/link";
import { MeetingBoard } from "@/components/meeting-board";
import { getCalendarDisplayState } from "@/lib/calendar/client";

export const dynamic = "force-dynamic";

export default async function MeetingPage() {
  const calendar = await getCalendarDisplayState();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.17),transparent_28%),radial-gradient(circle_at_82%_88%,rgba(251,191,36,0.12),transparent_30%),linear-gradient(160deg,#061116_0%,#0c1118_48%,#17120d_100%)]" />
      <div className="relative flex w-full max-w-3xl flex-col gap-4">
        <MeetingBoard calendar={calendar} />
        <div className="flex justify-end gap-3 text-xs text-white/45">
          <Link href="/display" className="hover:text-white/75">
            Tesla + Calendar
          </Link>
          <Link href="/meeting" className="hover:text-white/75">
            Refresh snapshot
          </Link>
        </div>
      </div>
    </main>
  );
}
