"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CloudCheck, TriangleAlert } from "lucide-react";
import { useAppData } from "./AppData";
import { AppShell, PageHeader } from "./AppShell";
import { UploadList, useNow, useUploads } from "./UploadsMenu";
import { Card } from "./ui";

/** Every video on its way to the cloud, with its stage and progress. */
export function UploadsPage() {
  const router = useRouter();
  const { orders } = useAppData();
  const { online, items, onTheWay, failing } = useUploads();
  const now = useNow(items.length > 0);
  const [search, setSearch] = useState("");

  const summary = !online
    ? "The packing computer is offline. Uploads carry on when it is back."
    : onTheWay.length === 0
      ? "All videos are uploaded"
      : `${onTheWay.length} ${onTheWay.length === 1 ? "video" : "videos"} on the way to the cloud`;

  return (
    <AppShell>
      <PageHeader
        title="Uploads"
        subtitle="Follow each packing video as it is sent to the cloud"
        shopify={orders.shopify}
        search={search}
        onSearchChange={setSearch}
        onSearchSubmit={() => router.push("/orders")}
      />

      <Card className="!p-0 overflow-hidden">
        <div className="px-5 sm:px-6 pt-5 pb-4">
          <p className="text-sm font-medium flex items-center gap-2">
            {online && onTheWay.length === 0 && (
              <CloudCheck className="w-4 h-4 text-[#2F6B3F]" />
            )}
            {failing && <TriangleAlert className="w-4 h-4 text-[#D9443A]" />}
            {summary}
          </p>
        </div>
        {items.length > 0 ? (
          <div className="border-t border-[#E6E8F0]">
            <UploadList items={items} now={now} />
          </div>
        ) : (
          <p className="px-6 py-10 text-center text-sm text-muted border-t border-[#E6E8F0]">
            {online
              ? "Nothing is uploading. Every saved video is in the cloud."
              : "Nothing to show while the packing computer is offline."}
          </p>
        )}
        <p className="px-5 sm:px-6 py-3 text-[11px] leading-4 text-muted border-t border-[#E6E8F0]">
          A video stays on the packing computer until the cloud confirms it, so
          a slow or lost connection only delays it. Uploaded videos are listed
          for 3 minutes.
        </p>
      </Card>
    </AppShell>
  );
}
