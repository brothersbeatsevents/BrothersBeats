'use client';

import { QRCodeSVG } from 'qrcode.react';

export interface TicketCardData {
  id: string;
  ticketNumber: string;
  status: string;
  attendeeName?: string;
  ticketTierName?: string;
  pdfDownloadUrl?: string;
}

export default function TicketCard({
  ticket,
  eventTitle,
  onDownload,
}: {
  ticket: TicketCardData;
  eventTitle?: string;
  onDownload?: (ticket: TicketCardData) => void;
}) {
  const cancelled = ticket.status === 'CANCELLED' || ticket.status === 'REFUNDED';

  return (
    <div className={`bg-bb-surface border border-bb-border rounded-2xl p-4 sm:p-5 flex flex-wrap items-center gap-3 sm:gap-4 ${cancelled ? 'opacity-60' : ''}`}>
      <div className="bg-white p-2 rounded-lg border border-bb-border shrink-0">
        <QRCodeSVG value={ticket.ticketNumber} size={72} />
      </div>
      <div className="flex-1 min-w-[8rem]">
        {eventTitle && <p className="font-semibold text-bb-text truncate">{eventTitle}</p>}
        {ticket.ticketTierName && <p className="text-sm font-semibold text-bb-text">{ticket.ticketTierName}</p>}
        <p className="text-sm text-bb-text-secondary">{ticket.attendeeName || 'Guest'}</p>
        <p className="text-xs text-bb-text-muted mt-0.5">Ticket #{ticket.ticketNumber}</p>
        {cancelled && (
          <p className="text-xs font-semibold text-bb-red mt-1">
            {ticket.status === 'CANCELLED' ? 'Cancelled' : 'Refunded'}
          </p>
        )}
      </div>
      {ticket.pdfDownloadUrl && !cancelled && (
        <a
          href={ticket.pdfDownloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onDownload?.(ticket)}
          className="w-full sm:w-auto shrink-0 text-center text-sm font-semibold text-bb-gold hover:text-bb-gold-dark border border-bb-gold rounded-full px-4 py-2 transition-colors"
        >
          Download
        </a>
      )}
    </div>
  );
}
