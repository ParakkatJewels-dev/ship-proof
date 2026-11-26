"use client";

import React, { useRef, useState } from "react";
import { loadWatch, PUBLIC_API } from "../lib/watch";

/**
 * Plays the packing video. The address it plays from is temporary, so if playback fails (for example
 * the page was left open for hours) it asks for a fresh one once, then offers a reload.
 */
export function WatchPlayer({
  token,
  initialUrl,
}: {
  token: string;
  initialUrl: string;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [failed, setFailed] = useState(false);
  const retried = useRef(false);

  const onError = async () => {
    if (retried.current) return setFailed(true);
    retried.current = true;
    const fresh = await loadWatch(token, PUBLIC_API);
    if (fresh.state === "ready") setUrl(fresh.playbackUrl);
    else setFailed(true);
  };

  if (failed) {
    return (
      <div className="aspect-video lg:aspect-auto lg:h-full w-full rounded-2xl bg-canvas flex flex-col items-center justify-center gap-3 text-center p-6">
        <p className="font-semibold">The video could not be played</p>
        <p className="text-sm text-muted">
          Check your internet connection, then try again.
        </p>
        <button
          type="button"
          onClick={() => location.reload()}
          className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-accent hover:bg-accent-dark cursor-pointer"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <video
      key={url}
      src={url}
      controls
      playsInline
      preload="metadata"
      controlsList="nodownload"
      onError={onError}
      // On large screens the video fills the height it is given, keeping its shape (letterboxed).
      className="w-full aspect-video lg:aspect-auto lg:h-full rounded-2xl bg-black object-contain"
    />
  );
}
