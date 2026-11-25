import type { Metadata } from "next";
import { PackageCheck, Clock, VideoOff, WifiOff } from "lucide-react";
import { loadWatch } from "../../../lib/watch";
import { WatchPlayer } from "../../../components/WatchPlayer";

// Every visit asks the API again, so an expired or deleted video is never shown from a cache.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Packing video – ShipProof",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

function Message({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Clock;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-10 text-center">
      <span className="w-14 h-14 rounded-full bg-canvas text-muted inline-flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </span>
      <h1 className="text-xl font-semibold mt-4">{title}</h1>
      <p className="text-sm text-muted mt-2 max-w-sm mx-auto">{children}</p>
    </div>
  );
}

/**
 * The page a customer opens from the link on their order. The secret in the address is the only
 * credential: it identifies one video of one order. No sign-in, and nothing else on the site is reachable
 * from here.
 */
export default async function WatchPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await loadWatch(token);

  return (
    <main className="min-h-screen bg-canvas text-ink flex items-start sm:items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-5 sm:p-8">
        <div className="flex items-center gap-3 mb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-tight.png"
            alt=""
            className="w-10 h-10 object-contain"
          />
          <span className="font-calligraphy text-2xl">ShipProof</span>
        </div>

        {data.state === "ready" && (
          <>
            <div className="flex items-center gap-2 text-[#2F6B3F]">
              <PackageCheck className="w-5 h-5" />
              <span className="text-sm font-semibold">Order packed</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold mt-1">
              Packing video{data.orderNumber ? ` · ${data.orderNumber}` : ""}
            </h1>
            <p className="text-sm text-muted mt-1 mb-5">
              This video was recorded while your order was packed.
            </p>
            <WatchPlayer token={token} initialUrl={data.playbackUrl} />
          </>
        )}

        {data.state === "expired" && (
          <Message icon={Clock} title="This video is no longer available">
            Packing videos are kept for a limited time after delivery
            {data.orderNumber ? ` (order ${data.orderNumber})` : ""}, and this
            one has been removed.
          </Message>
        )}

        {data.state === "unavailable" && (
          <Message icon={VideoOff} title="We couldn't find this video">
            The link may be incomplete or out of date. Open it again from your
            order page, or contact the store.
          </Message>
        )}

        {data.state === "error" && (
          <Message icon={WifiOff} title="Something went wrong">
            We couldn&apos;t load the video right now. Please try again in a
            moment.
          </Message>
        )}
      </div>
    </main>
  );
}
