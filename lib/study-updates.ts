"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";

const CHANNEL = "study-updates";
const EVENT = "changed";
const LOCAL_EVENT = "study-data-changed";

// Await removal before reusing the topic during navigation or Strict Mode remounts.
let channelCleanup: Promise<unknown> = Promise.resolve();

export function subscribeToStudyUpdates(onChange: () => void) {
  const supabase = createClient();
  let active = true;
  let channel: RealtimeChannel | undefined;

  window.addEventListener(LOCAL_EVENT, onChange);
  void channelCleanup.then(() => {
    if (!active) return;
    channel = supabase
      .channel(CHANNEL)
      .on("broadcast", { event: EVENT }, onChange)
      .subscribe((status) => {
        // Catch changes missed before joining, or while reconnecting.
        if (status === "SUBSCRIBED") onChange();
      });
  });

  return () => {
    active = false;
    window.removeEventListener(LOCAL_EVENT, onChange);
    if (channel) channelCleanup = supabase.removeChannel(channel);
  };
}

/** Signal a committed write. Broadcasts contain no names, reports, or timer data. */
export function notifyStudyUpdate(supabase: SupabaseClient) {
  window.dispatchEvent(new Event(LOCAL_EVENT));
  void channelCleanup
    .then(() => supabase.channel(CHANNEL).httpSend(EVENT, {}, { timeout: 3000 }))
    .catch(() => {
      // A notification failure must never reject a successful timer/goal write.
      // Reconnect, visibility, and periodic data checks recover missed messages.
      console.warn("Live notification could not be delivered. Data will sync on the next check.");
    });
}
