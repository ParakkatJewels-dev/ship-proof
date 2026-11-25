import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useEffect, useState } from "preact/hooks";

// UNTESTED. Written from Shopify's customer account UI extension documentation.
//
// What it does: on the customer's order status page, show "Order packed" and a Watch Packing Video button,
// but only while ShipProof has stored a video link on that order. The link is the permanent ShipProof
// watch page address, so it keeps working until the video is deleted after the retention period. When the
// video is deleted, ShipProof removes the link from the order and this block hides the button.

const QUERY = `
  query ShipProofPacking($id: ID!) {
    order(id: $id) {
      status: metafield(namespace: "shipproof", key: "packing_status") { value }
      video: metafield(namespace: "shipproof", key: "packing_video_url") { value }
    }
  }
`;

export default function () {
  render(<PackingVideoBlock />, document.body);
}

function PackingVideoBlock() {
  const orderId = shopify.order?.value?.id;
  const [packing, setPacking] = useState(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("shopify://customer-account/api/2025-10/graphql.json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: QUERY, variables: { id: orderId } }),
        });
        const { data } = await res.json();
        if (!cancelled) {
          setPacking({
            packed: data?.order?.status?.value === "packed",
            url: data?.order?.video?.value ?? null,
          });
        }
      } catch {
        // Not being able to read the fields must never break the order page: show nothing.
        if (!cancelled) setPacking(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  // Not packed by ShipProof, or the video has been removed: show nothing at all.
  if (!packing?.packed || !packing.url) return null;

  return (
    <s-section>
      <s-stack gap="small-300">
        <s-heading>Order packed</s-heading>
        <s-text>Your order has been packed and verified.</s-text>
        <s-button href={packing.url} target="_blank">
          Watch Packing Video
        </s-button>
      </s-stack>
    </s-section>
  );
}
