import type { Metadata } from "next";
import { PackageCheck, Clock, VideoOff, WifiOff } from "lucide-react";
import { loadWatch } from "../../../lib/watch";
import { WatchPlayer } from "../../../components/WatchPlayer";
import { ProductThumb } from "../../../components/ui";
import { DEMO_ORDERS } from "../../../lib/orders";
import type { WatchItem } from "../../../lib/watch";

/** The products to list: the order's own, or in local demo mode the matching demo order's. */
function productsOf(data: {
  orderNumber: string;
  items?: WatchItem[];
  demo?: boolean;
}): WatchItem[] {
  if (!data.demo) return data.items ?? [];
  const demo = DEMO_ORDERS.find((o) => o.orderNumber === data.orderNumber);
  return (demo?.items ?? []).map((i) => ({
    title: i.name,
    quantity: i.quantity,
    imageUrl: i.imageUrl,
  }));
}

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
  const products = data.state === "ready" ? productsOf(data) : [];
  const itemCount = products.reduce((n, i) => n + i.quantity, 0);

  const ready = data.state === "ready";

  return (
    // Large screens: the page fills the window, video on the left and the products beside it, with no
    // page scroll. Phones: one column, video first.
    <main className="min-h-dvh lg:h-dvh bg-canvas text-ink flex flex-col p-3 sm:p-5 lg:p-6">
      <div
        className={`w-full mx-auto rounded-3xl bg-white p-5 sm:p-7 flex flex-col flex-1 min-h-0 ${ready ? "" : "max-w-2xl justify-center"}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 shrink-0">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-tight.png"
              alt=""
              className="w-10 h-10 object-contain"
            />
            <span className="font-calligraphy text-2xl">ShipProof</span>
          </div>
          {ready && (
            <div className="flex items-center gap-2 text-[#2F6B3F] bg-[#E3EFE5] rounded-full px-3 py-1">
              <PackageCheck className="w-4 h-4" />
              <span className="text-sm font-semibold">Order packed</span>
            </div>
          )}
        </div>

        {data.state === "ready" && (
          <>
            <div className="mt-4 mb-4 shrink-0">
              <h1 className="text-xl sm:text-2xl font-semibold">
                Packing video{data.orderNumber ? ` · ${data.orderNumber}` : ""}
              </h1>
              <p className="text-sm text-muted mt-1">
                This video was recorded while your order was packed.
              </p>
            </div>

            <div
              className={`grid content-start gap-5 lg:content-stretch lg:flex-1 lg:min-h-0 lg:gap-6 ${products.length > 0 ? "lg:grid-cols-[minmax(0,1fr)_360px]" : ""}`}
            >
              <div className="min-h-0 lg:h-full">
                <WatchPlayer token={token} initialUrl={data.playbackUrl} />
              </div>

              {products.length > 0 && (
                <section className="min-h-0 flex flex-col rounded-2xl border border-[#E6E8F0] overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#E6E8F0] bg-canvas/60 shrink-0">
                    <h2 className="text-base font-semibold">In this order</h2>
                    <span className="text-xs font-semibold text-accent-dark bg-accent-pale rounded-full px-2.5 py-0.5">
                      {itemCount} {itemCount === 1 ? "item" : "items"}
                    </span>
                  </div>
                  <ul className="divide-y divide-[#E6E8F0] lg:overflow-y-auto">
                    {products.map((item, i) => (
                      <li
                        key={`${item.title}-${i}`}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <ProductThumb
                          src={item.imageUrl}
                          name={item.title}
                          size={52}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{item.title}</p>
                          {item.variantTitle && (
                            <p className="text-xs text-muted mt-0.5">
                              {item.variantTitle}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-semibold tabular-nums shrink-0">
                          × {item.quantity}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
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
