"use client";

import React from "react";
import { CheckCircle2, Clock, PackageCheck, Truck, Home } from "lucide-react";

export type OrderStatus = "received" | "confirmed" | "packing" | "out_for_delivery" | "delivered" | "completed";

interface OrderStatusTrackerProps {
  status: OrderStatus;
  orderNumber: string;
  createdAt: string;
}

const STEPS = [
  { key: "received", label: "Order Received", desc: "Placed successfully", icon: Clock },
  { key: "confirmed", label: "Confirmed", desc: "Accepted by Shop", icon: CheckCircle2 },
  { key: "packing", label: "Packing", desc: "Items gathered & boxed", icon: PackageCheck },
  { key: "out_for_delivery", label: "Out for Delivery", desc: "Rider on the way", icon: Truck },
  { key: "delivered", label: "Delivered", desc: "Doorstep delivery completed", icon: Home },
];

export const OrderStatusTracker: React.FC<OrderStatusTrackerProps> = ({
  status = "received",
  orderNumber,
  createdAt,
}) => {
  const normalizedStatus = status === "completed" ? "delivered" : status;
  const currentIndex = STEPS.findIndex((s) => s.key === normalizedStatus);
  const activeStep = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-7 space-y-6 shadow-xs">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
        <div>
          <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
            Live Order Tracking
          </span>
          <h3 className="text-base font-black text-gray-900">Order #{orderNumber}</h3>
        </div>
        <div className="text-xs text-gray-500 font-medium">
          Placed: {new Date(createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {/* Progress Track */}
      <div className="relative">
        <div className="grid grid-cols-5 gap-2 text-center">
          {STEPS.map((step, idx) => {
            const isCompleted = idx <= activeStep;
            const isCurrent = idx === activeStep;
            const Icon = step.icon;

            return (
              <div key={step.key} className="flex flex-col items-center gap-2 relative z-10">
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all ${
                    isCurrent
                      ? "bg-purple-600 text-white ring-4 ring-purple-100 shadow-md scale-110"
                      : isCompleted
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div
                    className={`text-xs font-bold ${
                      isCurrent
                        ? "text-purple-700 font-black"
                        : isCompleted
                        ? "text-gray-900"
                        : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-gray-400 hidden sm:block">
                    {step.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress Line */}
        <div className="absolute top-5 sm:top-6 left-8 right-8 h-1 bg-gray-100 -z-0">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(activeStep / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
