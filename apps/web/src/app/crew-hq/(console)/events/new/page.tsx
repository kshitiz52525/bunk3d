'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatPaise } from '@bunk3d/core';
import { useApi, useAsync, type EventCategory, type TicketPricing } from '@bunk3d/api';
import { Btn, PageHead } from '@/components/kit';
import { Async, Eyebrow, useOnline } from '../../../../_console/blocks';
import { useClub } from '../../../_components/club';

const CATS: EventCategory[] = ['Tech', 'Cultural', 'Sports', 'Workshop', 'Fest'];
const ms = (v: string) => (v ? new Date(v).getTime() : NaN);

// CH4 / E4 Create event
export default function Page() {
  const api = useApi().console;
  const club = useClub();
  const router = useRouter();
  const online = useOnline();
  const events = useAsync(() => api.crewEvents(club.id), [club.id]);
  const [f, setF] = useState({ title: '', category: '' as EventCategory | '', starts: '', ends: '', venue: '', capacity: '', rsvp: '', description: '', paid: false, price: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [priced, setPriced] = useState<{ paise: number; p: TicketPricing } | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const pricePaise = Math.round(Number(f.price) * 100);

  useEffect(() => {
    if (!f.paid || !Number.isFinite(pricePaise) || pricePaise < 100) return;
    let live = true;
    api.crewPriceTicket(pricePaise).then((p) => live && setPriced({ paise: pricePaise, p }), () => live && setPriced(null));
    return () => { live = false; };
  }, [f.paid, pricePaise, api]);

  const pricing = f.paid && priced && priced.paise === pricePaise ? priced.p : null;

  const submit = async () => {
    setBusy(true); setFailed(false); setErrs({});
    try {
      const r = await api.crewCreateEvent(club.id, {
        title: f.title, category: f.category, startsAtMs: ms(f.starts), endsAtMs: ms(f.ends), venue: f.venue, capacity: Number(f.capacity),
        rsvpDeadlineMs: ms(f.rsvp), description: f.description, ticketType: f.paid ? 'paid' : 'free', pricePaise: f.paid ? pricePaise : 0,
      });
      if (r.ok) router.push('/crew-hq/events'); else setErrs(Object.fromEntries(r.issues.map((i) => [i.field, i.message])));
    } catch { setFailed(true); } finally { setBusy(false); }
  };
  const E = ({ k }: { k: string }) => (errs[k] ? <span className="fielderr" role="alert">{errs[k]}</span> : null);

  return (
    <Async state={events}>
      {(ev) => (
        <>
          <Eyebrow>CH4 · E4 · WAVE 1</Eyebrow>
          <PageHead title="New event" sub={`Hosting as ${club.name}`} />
          <form className="form" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
            <label>Title<input value={f.title} onChange={(e) => set('title', e.target.value)} /><E k="title" /></label>
            <div className="lbl">Category
              <div className="chips" role="radiogroup" aria-label="Category">{CATS.map((c) => <button key={c} type="button" role="radio" aria-checked={f.category === c} className="chip" onClick={() => set('category', c)}>{c}</button>)}</div><E k="category" /></div>
            <div className="two">
              <label>Starts<input type="datetime-local" value={f.starts} onChange={(e) => set('starts', e.target.value)} /><E k="startsAtMs" /></label>
              <label>Ends<input type="datetime-local" value={f.ends} onChange={(e) => set('ends', e.target.value)} /><E k="endsAtMs" /></label>
              <label>Venue<input value={f.venue} onChange={(e) => set('venue', e.target.value)} /><E k="venue" /></label>
              <label>Capacity<input inputMode="numeric" value={f.capacity} onChange={(e) => set('capacity', e.target.value.replace(/\D/g, ''))} /><E k="capacity" /></label>
              <label>RSVP deadline<input type="datetime-local" value={f.rsvp} onChange={(e) => set('rsvp', e.target.value)} /><E k="rsvpDeadlineMs" /></label>
            </div>
            <label>Description<textarea rows={4} value={f.description} onChange={(e) => set('description', e.target.value)} /></label>
            <div className="lbl">Ticket type
              <div className="row">
                <div className="chips" role="radiogroup" aria-label="Ticket type">
                  <button type="button" role="radio" aria-checked={!f.paid} className="chip" onClick={() => set('paid', false)}>Free</button>
                  <button type="button" role="radio" aria-checked={f.paid} className="chip" disabled={!ev.paidAllowed} onClick={() => set('paid', true)}>Paid</button>
                </div>
                {f.paid ? <label>Price in rupees<input inputMode="decimal" value={f.price} onChange={(e) => set('price', e.target.value.replace(/[^\d.]/g, ''))} /></label> : null}
              </div>
              <E k="pricePaise" /><E k="ticketType" />
            </div>
            <div className="note" aria-live="polite">
              {!ev.paidAllowed ? 'Paid events open when your campus reaches wave 3. Free RSVP works now.'
                : f.paid ? (pricing ? `Buyers pay ${formatPaise(pricing.pricePaise)} + 5% platform fee (${formatPaise(pricing.platformFeePaise)}) + 18% GST on that fee (${formatPaise(pricing.gstPaise)}) = ${formatPaise(pricing.totalPaise)}. Paid through Razorpay; full refund until 48 h before, none after; automatic refund if you cancel.` : 'Set a price to see what buyers pay.')
                : 'Free RSVP. Switch to Paid to sell tickets.'}
              {' '}You publish results and certificates after the event; they are added to attendees&apos; profiles.
            </div>
            {failed ? <div className="banner err" role="alert">That did not save. Try again.</div> : null}
            <div className="row">
              <Btn type="submit" disabled={busy || !online}>Publish event</Btn>
              <Btn kind="ghost" onClick={() => router.back()}>Cancel</Btn>
            </div>
            {!online ? <div className="note">You are offline. Reconnect to publish.</div> : null}
          </form>
        </>
      )}
    </Async>
  );
}
