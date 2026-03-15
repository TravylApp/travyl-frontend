'use client';

import type { FlightDetailsType } from '@travyl/shared';
import {
  Ticket,
  Luggage,
  ShieldCheck,
  RefreshCw,
  CreditCard,
  ExternalLink,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { useState } from 'react';

const MOCK_FLIGHT_BOOKING_DETAILS: FlightDetailsType = {
  confirmationNumber: 'XHGT7K',
  pnr: 'XHGT7K',
  ticketNumbers: ['016-2345678901', '016-2345678902'],
  fareClass: 'Economy (Y)',
  fareType: 'Main Cabin',
  baggageAllowance: {
    carryOn: '1 personal item + 1 carry-on bag (max 10 kg)',
    checked: '1 checked bag included (max 23 kg)',
    fees: 0,
  },
  cancellationPolicy: 'Non-refundable. Cancellation fee of $199 applies. Residual value issued as flight credit valid for 1 year.',
  changePolicy: 'Changes permitted with no change fee. Fare difference may apply.',
  refundPolicy: 'Refund to original payment method within 24 hours of booking. After 24 hours, refund issued as flight credit minus cancellation fee.',
  checkInUrl: 'https://www.aa.com/check-in',
  checkInOpens: '24 hours before departure',
};

interface FlightBookingDetailsProps {
  isVisible: boolean;
}

export function FlightBookingDetails({ isVisible }: FlightBookingDetailsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isVisible) return null;

  const details: FlightDetailsType = MOCK_FLIGHT_BOOKING_DETAILS;

  const copyToClipboard = (value: string, field: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm mb-4">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Booking Details</h3>
        <p className="text-xs text-gray-500 mt-0.5">Your flight confirmation and policies</p>
      </div>

      <div className="p-5 space-y-5">
        {/* ── Booking Reference ────────────────────────────── */}
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
          <h4 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            <Ticket size={14} className="text-blue-500" />
            Booking Reference
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {/* Confirmation Number */}
            <div>
              <span className="block text-[11px] text-gray-400 mb-0.5">Confirmation No.</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900 font-mono">
                  {details.confirmationNumber}
                </span>
                <button
                  onClick={() => copyToClipboard(details.confirmationNumber, 'confirmation')}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                  title="Copy"
                >
                  {copiedField === 'confirmation' ? (
                    <CheckCircle2 size={14} className="text-emerald-500" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            </div>

            {/* PNR */}
            <div>
              <span className="block text-[11px] text-gray-400 mb-0.5">PNR / Record Locator</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900 font-mono">{details.pnr}</span>
                <button
                  onClick={() => copyToClipboard(details.pnr, 'pnr')}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                  title="Copy"
                >
                  {copiedField === 'pnr' ? (
                    <CheckCircle2 size={14} className="text-emerald-500" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            </div>

            {/* Fare class */}
            <div>
              <span className="block text-[11px] text-gray-400 mb-0.5">Fare Class</span>
              <span className="text-sm font-medium text-gray-900">{details.fareClass}</span>
            </div>

            {/* Fare type */}
            <div>
              <span className="block text-[11px] text-gray-400 mb-0.5">Fare Type</span>
              <span className="text-sm font-medium text-gray-900">{details.fareType}</span>
            </div>
          </div>
        </div>

        {/* ── Baggage Allowance ────────────────────────────── */}
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
          <h4 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            <Luggage size={14} className="text-blue-500" />
            Baggage Allowance
          </h4>
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center mt-0.5">
                <span className="text-[10px] font-bold text-blue-600">C</span>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-900">Carry-on</span>
                <span className="block text-xs text-gray-500">{details.baggageAllowance.carryOn}</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center mt-0.5">
                <span className="text-[10px] font-bold text-blue-600">L</span>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-900">Checked Baggage</span>
                <span className="block text-xs text-gray-500">{details.baggageAllowance.checked}</span>
              </div>
            </div>
            {details.baggageAllowance.fees > 0 && (
              <div className="mt-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                Additional bag fees: ${details.baggageAllowance.fees} per bag
              </div>
            )}
            {details.baggageAllowance.fees === 0 && (
              <div className="mt-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                No additional baggage fees
              </div>
            )}
          </div>
        </div>

        {/* ── Ticket Numbers ──────────────────────────────── */}
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
          <h4 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            <CreditCard size={14} className="text-blue-500" />
            Ticket Numbers
          </h4>
          <div className="space-y-2">
            {details.ticketNumbers.map((ticket, idx) => (
              <div
                key={ticket}
                className="flex items-center justify-between rounded-lg bg-white border border-gray-200 px-3 py-2"
              >
                <div>
                  <span className="block text-[10px] text-gray-400">
                    Passenger {idx + 1}
                  </span>
                  <span className="text-sm font-mono font-medium text-gray-900">{ticket}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(ticket, `ticket-${idx}`)}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                  title="Copy ticket number"
                >
                  {copiedField === `ticket-${idx}` ? (
                    <CheckCircle2 size={14} className="text-emerald-500" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Policies ────────────────────────────────────── */}
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
          <h4 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            <ShieldCheck size={14} className="text-blue-500" />
            Policies
          </h4>
          <div className="space-y-3">
            {/* Cancellation */}
            <div className="flex items-start gap-3">
              <div className="w-1 h-full min-h-[24px] rounded-full bg-red-300 mt-0.5" />
              <div>
                <span className="block text-xs font-semibold text-gray-700 mb-0.5">
                  Cancellation
                </span>
                <span className="block text-xs text-gray-500 leading-relaxed">
                  {details.cancellationPolicy}
                </span>
              </div>
            </div>

            {/* Changes */}
            <div className="flex items-start gap-3">
              <div className="w-1 h-full min-h-[24px] rounded-full bg-amber-300 mt-0.5" />
              <div>
                <span className="block text-xs font-semibold text-gray-700 mb-0.5">Changes</span>
                <span className="block text-xs text-gray-500 leading-relaxed">
                  {details.changePolicy}
                </span>
              </div>
            </div>

            {/* Refund */}
            <div className="flex items-start gap-3">
              <div className="w-1 h-full min-h-[24px] rounded-full bg-emerald-300 mt-0.5" />
              <div>
                <span className="block text-xs font-semibold text-gray-700 mb-0.5">Refund</span>
                <span className="block text-xs text-gray-500 leading-relaxed">
                  {details.refundPolicy}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Check-in CTA ────────────────────────────────── */}
        <div
          className="rounded-xl p-4 text-white"
          style={{
            background: 'linear-gradient(135deg, #2563eb, #3b82f6, #60a5fa)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw size={16} />
            <h4 className="text-sm font-semibold">Online Check-in</h4>
          </div>
          <p className="text-xs text-white/80 mb-3">
            Check-in opens {details.checkInOpens}. We&apos;ll send you a reminder.
          </p>
          <a
            href={details.checkInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-blue-600 text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Check In Now
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
