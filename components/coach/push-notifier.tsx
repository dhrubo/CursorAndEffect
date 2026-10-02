"use client";

import { useEffect, useSyncExternalStore } from "react";
import { reminderAt, type CoachCopy } from "@/lib/coach/copy";

const REMINDER_MS = 3 * 60 * 1000;

type ShownReminder = { copy: CoachCopy; visible: boolean } | null;

let shown: ShownReminder = null;
const shownListeners = new Set<() => void>();

const permissionListeners = new Set<() => void>();

function subscribePermission(onChange: () => void) {
  permissionListeners.add(onChange);
  return () => {
    permissionListeners.delete(onChange);
  };
}

function readPermission(): NotificationPermission | "unsupported" {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

function serverPermission(): "unknown" {
  return "unknown";
}

function publishPermission() {
  for (const listener of permissionListeners) listener();
}

function subscribeShown(onChange: () => void) {
  shownListeners.add(onChange);
  return () => {
    shownListeners.delete(onChange);
  };
}

function readShown() {
  return shown;
}

function serverShown(): ShownReminder {
  return null;
}

function publishShown(next: ShownReminder) {
  shown = next;
  for (const listener of shownListeners) listener();
}

async function readyRegistration() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    await navigator.serviceWorker.register("/sw.js");
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

async function showOsNotification(copy: CoachCopy) {
  if (readPermission() !== "granted") return;
  const registration = await readyRegistration();
  if (!registration || readPermission() !== "granted") return;
  await registration.showNotification(copy.title, {
    body: copy.detail,
    tag: "savings-reminder",
  });
}

function showReminder(index: number) {
  const copy = reminderAt(index);
  publishShown({ copy, visible: true });
  void showOsNotification(copy);
}

export function PushNotifier({ active }: { active: boolean }) {
  const permission = useSyncExternalStore(subscribePermission, readPermission, serverPermission);
  const shownReminder = useSyncExternalStore(subscribeShown, readShown, serverShown);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let step = 0;
    const tick = () => {
      if (cancelled) return;
      showReminder(step);
      step += 1;
    };
    tick();
    const id = window.setInterval(tick, REMINDER_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [active]);

  async function allowAlerts() {
    if (typeof Notification === "undefined" || !shownReminder) return;
    const next = await Notification.requestPermission();
    publishPermission();
    if (next === "granted") await showOsNotification(shownReminder.copy);
  }

  if (!active || !shownReminder?.visible) return null;
  const { copy } = shownReminder;

  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="grid w-full max-w-md gap-2 rounded-2xl bg-white p-3 text-[#1a1a1a] shadow-lg">
        <p className="text-sm font-medium">{copy.title}</p>
        <p className="text-[13px] leading-snug text-[#1a1a1a]/70">{copy.detail}</p>
        <div className="flex flex-wrap gap-2">
          {permission === "default" && (
            <button
              type="button"
              onClick={() => void allowAlerts()}
              className="rounded-full bg-white px-4 py-2 text-[13px] text-[#1a1a1a] shadow"
            >
              Allow alerts
            </button>
          )}
          <button
            type="button"
            onClick={() => publishShown({ copy, visible: false })}
            className="rounded-full px-4 py-2 text-[13px] text-[#1a1a1a] hover:bg-[#ede8e0]"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
