// C:\Projects\animanga-platform\apps\web\src\app\(customer)\tickets\[id]\page.tsx
"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Calendar,
  MapPin,
  Loader2,
} from "lucide-react";
import { CryptographicQr } from "@/components/shared/cryptographic-qr";
import {
  unwrapApiData,
  type TicketWalletItemDto,
} from "@/lib/api/types/library";

export default function TicketGatePassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [ticket, setTicket] = useState<TicketWalletItemDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPass = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/v1/tickets/wallet", {
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          const data = unwrapApiData<{ tickets: TicketWalletItemDto[] }>(json);
          const found = data?.tickets?.find((t) => t.id === id) || null;
          setTicket(found);
        }
      } finally {
        setIsLoading(false);
      }
    };
    void loadPass();
  }, [id]);

  if (isLoading) {
    return (
      <div className="py-24 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-10 rounded-2xl bg-card border border-border text-center space-y-3">
        <p className="text-base font-black text-foreground">Ticket Not Found</p>
        <Link
          href="/tickets"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Ticket Wallet</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-5">
      <Link
        href="/tickets"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Ticket Wallet</span>
      </Link>

      <div className="rounded-3xl bg-card border-2 border-primary/40 shadow-2xl overflow-hidden text-center p-6 sm:p-8 flex flex-col items-center gap-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/15 text-success text-xs font-black uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          Ed25519 Signed Gate Pass
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-widest text-primary mb-1">
            {ticket.ticketNumber} • {ticket.ticketType}
          </p>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground">
            {ticket.event.title}
          </h1>
        </div>

        <CryptographicQr
          payload={ticket.credential.payload}
          signature={ticket.credential.signature}
          size={240}
        />

        <div className="w-full pt-4 border-t border-border flex flex-col gap-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span className="font-bold uppercase">Status</span>
            <span className="font-black text-success">{ticket.status}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold uppercase flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-primary" /> Event Time
            </span>
            <span className="font-semibold text-foreground">
              {new Date(ticket.event.startTime).toLocaleString("en-KE", {
                timeZone: "Africa/Nairobi",
              })}{" "}
              EAT
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold uppercase flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-primary" /> Venue
            </span>
            <span className="font-semibold text-foreground">
              {ticket.event.venue || "Nairobi, Kenya"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
