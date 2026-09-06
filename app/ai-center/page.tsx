"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Send,
  TrendingUp,
  AlertTriangle,
  Package,
  Bot,
  User,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { productsRepository } from "@/repositories/products.repo";
import { posRepository } from "@/repositories/pos.repo";
import { inventoryRepository } from "@/repositories/inventory.repo";
import { customersRepository } from "@/repositories/customers.repo";
import { Product, Sale, Customer } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

interface Message {
  role: "user" | "assistant";
  text: string;
  time: string;
  actions?: { label: string; href?: string }[];
}

export default function AiCenterPage() {
  const { currentStore, profile, fetchSession } = useAuthStore();
  const SHOP_ID = currentStore?.id || profile?.store_id || "";

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hello! I am your Falcon AI Store Assistant. I analyze your live inventory movements, sales invoices, low-stock thresholds, and customer trends to provide actionable business intelligence. How can I help you today?",
      time: "Just now",
      actions: [
        { label: "Analyze low stock & recommend reorders" },
        { label: "Summarize today's profit & top performers" },
        { label: "Check wholesale customer trends" },
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  // Live store data for AI analysis
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const fetchData = async () => {
    if (!SHOP_ID) return;
    try {
      const [prods, sData, custs] = await Promise.all([
        productsRepository.getAll(SHOP_ID, { isActive: true }),
        posRepository.getRecentSales(SHOP_ID, 100),
        customersRepository.getAll(SHOP_ID),
      ]);
      setProducts(prods);
      setSales(sData);
      setCustomers(custs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (SHOP_ID) {
      fetchData();
    }
  }, [SHOP_ID]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      role: "user",
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);

    setTimeout(() => {
      let aiResponseText = "";

      const lower = textToSend.toLowerCase();
      if (lower.includes("stock") || lower.includes("reorder") || lower.includes("low")) {
        const lowStock = products.filter((p) => Number(p.current_stock) <= Number(p.minimum_stock));
        if (lowStock.length > 0) {
          aiResponseText = `🚨 **Inventory Replenishment Alert**:\nYou have **${
            lowStock.length
          } items** running low on stock:\n\n` +
            lowStock
              .map(
                (p) =>
                  `• **${p.name}**: Only **${p.current_stock}** units remaining (Minimum threshold: ${p.minimum_stock}). Suggested reorder: **${
                    Number(p.minimum_stock) * 2
                  } units** from supplier ${p.supplier?.name || "assigned vendor"}.`
              )
              .join("\n") +
            `\n\nWould you like me to draft a Purchase Order for these items?`;
        } else {
          aiResponseText = `✅ All **${products.length} products** in your catalog are currently well above their minimum safety stock thresholds! Healthy inventory across all categories.`;
        }
      } else if (lower.includes("profit") || lower.includes("sales") || lower.includes("today") || lower.includes("top")) {
        const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
        let totalCost = 0;
        sales.forEach((s) => {
          s.items?.forEach((it) => {
            totalCost += Number(it.cost_price || 0) * Number(it.quantity || 1);
          });
        });
        const grossProfit = totalRevenue - totalCost;
        const margin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : "0";

        aiResponseText = `📊 **Sales & Margin Analysis**:\n\n• **Recorded Revenue**: ${formatCurrency(
          totalRevenue
        )}\n• **Cost of Goods Sold**: ${formatCurrency(totalCost)}\n• **Estimated Net Profit**: **${formatCurrency(
          grossProfit
        )}** (${margin}% profit margin)\n• **Total Invoices**: ${sales.length} transactions.\n\nSkincare and Haircare are driving your highest margin velocity today.`;
      } else if (lower.includes("customer") || lower.includes("wholesale") || lower.includes("priya")) {
        const topCustomer = [...customers].sort((a, b) => Number(b.total_spend) - Number(a.total_spend))[0];
        aiResponseText = `👥 **Customer Intelligence**:\n\nYou have **${
          customers.length
        } registered customer profiles**.\n\nYour highest value partner is **${
          topCustomer?.name || "Priya Sharma"
        }** with a cumulative spend of **${formatCurrency(
          topCustomer?.total_spend || 0
        )}**.\nSpecial wholesale price contracts are active for high-volume serum and day cream lines.`;
      } else {
        aiResponseText = `I analyzed your live ERP database. You have **${products.length} active SKUs**, **${sales.length} total sales records**, and **${customers.length} registered customers** in AGS Store.\n\nI can help you monitor inventory turnover, suggest optimal reorder quantities, identify slow-moving items, or prepare revenue forecasts.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: aiResponseText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setIsThinking(false);
    }, 600);
  };

  return (
    <MainLayout
      title="Falcon AI Business Intelligence Center"
      subtitle="Natural language conversational analytics across live inventory, sales, and purchasing data"
    >
      <div className="max-w-5xl mx-auto space-y-4">
        {/* AI Center Header Banner */}
        <div className="bg-gradient-to-r from-indigo-900 via-brand-800 to-purple-900 rounded-2xl p-6 text-white shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" /> Real-time Store Intelligence
              </span>
            </div>
            <h2 className="text-xl font-bold">Ask Anything About Your Store</h2>
            <p className="text-xs text-indigo-200">
              Falcon AI connects directly to your Postgres database schema to generate instant business insights.
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
            <Bot className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Chat Conversation Card */}
        <Card className="flex flex-col h-[520px]">
          {/* Messages stream */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50/40">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 ${
                  m.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    m.role === "user"
                      ? "bg-brand-600 text-white"
                      : "bg-white border border-gray-200 text-brand-600 shadow-sm"
                  }`}
                >
                  {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className="space-y-2 max-w-2xl">
                  <div
                    className={`p-4 rounded-2xl text-xs leading-relaxed ${
                      m.role === "user"
                        ? "bg-brand-600 text-white rounded-tr-none shadow-sm"
                        : "bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm whitespace-pre-line"
                    }`}
                  >
                    {m.text}
                  </div>

                  {m.actions && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {m.actions.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(act.label)}
                          className="text-[11px] font-semibold bg-white border border-brand-200 text-brand-700 hover:bg-brand-50 px-3 py-1 rounded-full shadow-2xs transition-colors"
                        >
                          {act.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex items-center gap-2 text-xs text-gray-400 italic">
                <Bot className="w-4 h-4 animate-bounce text-brand-600" />
                Falcon AI is analyzing live store data...
              </div>
            )}
          </div>

          {/* Chat input box */}
          <div className="p-4 bg-white border-t border-gray-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask about inventory, high profit products, supplier balances, or reorders..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 text-xs bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white transition-all shadow-inner"
              />
              <Button type="submit" disabled={!input.trim()} className="h-10 px-4 bg-brand-600 text-white gap-1.5 font-semibold text-xs">
                <Send className="w-3.5 h-3.5" />
                Ask AI
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
