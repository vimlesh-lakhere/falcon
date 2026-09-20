"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, AlertTriangle, AlertCircle, ShoppingBag, Clock } from "lucide-react";
import { notificationsRepository } from "@/repositories/notifications.repo";
import { Notification } from "@/types/database";
import { formatDateTime } from "@/lib/utils";

export function NotificationsDropdown({ shopId }: { shopId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await notificationsRepository.getAll(shopId);
      setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  }, [shopId]);

  useEffect(() => {
    loadNotifications();

    // Poll infrequently, and only while this tab is actually visible. This keeps a
    // background/idle ERP tab from making thousands of pointless Supabase reads a day
    // (free-tier friendly); opening the bell below always refreshes immediately.
    const POLL_MS = 90000;
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer === null) timer = setInterval(loadNotifications, POLL_MS);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        loadNotifications();
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsRepository.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsRepository.markAllAsRead(shopId);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next) loadNotifications();
        }}
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-gray-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-brand-50 text-brand-700 text-xs px-2 py-0.5 rounded-full font-medium">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium hover:underline flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                No notifications right now
              </div>
            ) : (
              notifications.map((n) => {
                const isWarning = n.type === "low_stock" || n.type === "out_of_stock";
                return (
                  <div
                    key={n.id}
                    onClick={() => handleMarkAsRead(n.id)}
                    className={`p-3.5 flex items-start gap-3 hover:bg-gray-50/80 transition-colors cursor-pointer ${
                      !n.is_read ? "bg-brand-50/20" : ""
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        isWarning ? "bg-amber-100 text-amber-700" : "bg-brand-100 text-brand-700"
                      }`}
                    >
                      {isWarning ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <ShoppingBag className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs ${
                          !n.is_read ? "font-semibold text-gray-900" : "text-gray-600"
                        } leading-relaxed`}
                      >
                        {n.message}
                      </p>
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        {formatDateTime(n.created_at)}
                      </span>
                    </div>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
