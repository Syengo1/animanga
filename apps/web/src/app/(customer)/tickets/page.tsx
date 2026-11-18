// C:\Projects\animanga-platform\apps\web\src\app\(customer)\tickets\page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Ticket,
  ShieldCheck,
  Calendar,
  MapPin,
  QrCode,
  Loader2,
  CheckCircle2,
  History,
  Copy,
  Check,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { CryptographicQr } from "@/components/shared/cryptographic-qr";
import {
  unwrapApiData,
  type TicketWalletItemDto,
} from "@/lib/api/types/library";
import { cn } from "@/lib/utils";

export default function TicketWalletPage() {
  const [tickets, setTickets] = useState<TicketWalletItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"ACTIVE" | "HISTORY">(
    "ACTIVE",
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const loadWallet = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/v1/tickets/wallet", {
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          const data = unwrapApiData<{ tickets: TicketWalletItemDto[] }>(json);
          if (data?.tickets) {
            setTickets(data.tickets);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    void loadWallet();
  }, []);

  const formatEAT = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("en-KE", {
        timeZone: "Africa/Nairobi",
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const copyPayload = async (ticket: TicketWalletItemDto) => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify({
          qrPayload: ticket.credential.payload,
          signature: ticket.credential.signature,
        }),
      );
      setCopiedId(ticket.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore
    }
  };

  const visibleTickets = tickets.filter((t) =>
    activeFilter === "ACTIVE" ? t.status === "ISSUED" : t.status !== "ISSUED",
  );

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs font-bold uppercase tracking-wider">
          Decrypting Ed25519 ticket wallet...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success/15 text-success text-[10px] font-black uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Ed25519 Cryptographic Passes
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight uppercase text-foreground flex items-center gap-2.5">
            <Ticket className="w-7 h-7 text-primary" />
            <span>Ticket Wallet</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
            Present your signed QR capability pass at the convention gate for
            single-use cryptographic verification.
          </p>
        </div>

        <div className="inline-flex p-1 rounded-xl bg-secondary border border-border self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveFilter("ACTIVE")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeFilter === "ACTIVE"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              Active Passes (
              {tickets.filter((t) => t.status === "ISSUED").length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("HISTORY")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeFilter === "HISTORY"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <History className="w-3.5 h-3.5" />
            <span>Past / Used</span>
          </button>
        </div>
      </div>

      {visibleTickets.length === 0 ? (
        <div className="py-20 px-4 rounded-2xl border border-dashed border-border bg-card/50 text-center flex flex-col items-center gap-3">
          <div className="size-12 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
            <Ticket className="w-6 h-6" />
          </div>
          <p className="text-base font-black text-foreground">
            {activeFilter === "ACTIVE"
              ? "No active convention passes in your wallet"
              : "No past or scanned tickets yet"}
          </p>
          <p className="text-xs text-muted-foreground max-w-md">
            When you reserve convention tickets via M-Pesa STK Push, your
            cryptographically signed passes appear here immediately upon
            settlement.
          </p>
          <Link
            href="/events"
            className={cn(
              buttonVariants({ variant: "default" }),
              "mt-1 h-9 px-4 rounded-xl text-xs font-bold",
            )}
          >
            Explore Upcoming Events
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {visibleTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="rounded-3xl bg-card border border-border shadow-md overflow-hidden flex flex-col md:flex-row"
            >
              {/* Left Pass Details */}
              <div className="flex-1 p-6 md:p-7 flex flex-col justify-between gap-5">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg bg-primary/15 text-primary text-xs font-black uppercase tracking-widest">
                      {ticket.ticketNumber}
                    </span>
                    <span
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border",
                        ticket.status === "ISSUED"
                          ? "bg-success/15 text-success border-success/30"
                          : "bg-secondary text-muted-foreground border-border",
                      )}
                    >
                      {ticket.status}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-foreground">
                    {ticket.event.title}
                  </h2>

                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs font-semibold text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      {formatEAT(ticket.event.startTime)} EAT
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      {ticket.event.venue || "Nairobi, Kenya"}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-secondary text-foreground font-bold">
                      Tier: {ticket.ticketType}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[11px] text-muted-foreground font-mono truncate max-w-xs">
                    Sig: {ticket.credential.signature.slice(0, 28)}...
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void copyPayload(ticket)}
                      className="h-8 px-3 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
                    >
                      {copiedId === ticket.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-success" />
                          <span>Copied Token</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Token</span>
                        </>
                      )}
                    </Button>

                    <Link
                      href={`/tickets/${ticket.id}`}
                      className={cn(
                        buttonVariants({ variant: "default", size: "sm" }),
                        "h-8 px-3.5 rounded-xl text-xs font-bold gap-1.5",
                      )}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Gate Scan View</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Perforated Divider + QR Stub */}
              <div className="border-t md:border-t-0 md:border-l border-dashed border-border bg-secondary/40 p-6 flex flex-col items-center justify-center gap-2 shrink-0">
                <CryptographicQr
                  payload={ticket.credential.payload}
                  signature={ticket.credential.signature}
                  size={148}
                />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Scan at Gate
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
