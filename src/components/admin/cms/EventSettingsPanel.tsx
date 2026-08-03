import { Calendar, Clock, MapPin, Link as LinkIcon, Users, DollarSign, Info } from 'lucide-react';

export interface EventSettings {
  eventName: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  venue: string;
  mapLink: string;
  registrationLink: string;
  capacity: string;
  registrationDeadline: string;
  isFree: boolean;
  price: string;
  organizer: string;
  bannerImage: string;
}

interface Props {
  value: EventSettings;
  onChange: (v: EventSettings) => void;
}

const field = (label: string, icon: React.ReactNode, children: React.ReactNode) => (
  <div>
    <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-500">
      {icon} {label}
    </label>
    {children}
  </div>
);

export const EMPTY_EVENT_SETTINGS: EventSettings = {
  eventName: '', startDate: '', endDate: '', startTime: '', endTime: '',
  timezone: 'Asia/Kolkata', venue: '', mapLink: '', registrationLink: '',
  capacity: '', registrationDeadline: '', isFree: true, price: '',
  organizer: '', bannerImage: '',
};

export default function EventSettingsPanel({ value, onChange }: Props) {
  const set = (k: keyof EventSettings, v: EventSettings[typeof k]) =>
    onChange({ ...value, [k]: v });

  // Computed status preview
  const today = new Date().toISOString().slice(0, 10);
  const status =
    !value.startDate ? '' :
    today < value.startDate ? '🟡 Upcoming' :
    today <= (value.endDate || value.startDate) ? '🟢 Ongoing' :
    '🔴 Past';

  return (
    <div className="rounded-xl border bg-gradient-to-b from-purple-50 to-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-purple-500">📅 Event Settings</p>
        {status && (
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold shadow-sm ring-1 ring-purple-100">
            {status}
          </span>
        )}
      </div>

      {field('Event Name', <Info className="h-3 w-3" />,
        <input className="input w-full text-sm" placeholder="Official event name"
          value={value.eventName} onChange={e => set('eventName', e.target.value)} />
      )}

      <div className="grid grid-cols-2 gap-2">
        {field('Start Date', <Calendar className="h-3 w-3" />,
          <input type="date" className="input w-full text-sm"
            value={value.startDate} onChange={e => set('startDate', e.target.value)} />
        )}
        {field('End Date', <Calendar className="h-3 w-3" />,
          <input type="date" className="input w-full text-sm"
            value={value.endDate} onChange={e => set('endDate', e.target.value)} />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {field('Start Time', <Clock className="h-3 w-3" />,
          <input type="time" className="input w-full text-sm"
            value={value.startTime} onChange={e => set('startTime', e.target.value)} />
        )}
        {field('End Time', <Clock className="h-3 w-3" />,
          <input type="time" className="input w-full text-sm"
            value={value.endTime} onChange={e => set('endTime', e.target.value)} />
        )}
      </div>

      {field('Organizer', <Users className="h-3 w-3" />,
        <input className="input w-full text-sm" placeholder="Organizing team or person"
          value={value.organizer} onChange={e => set('organizer', e.target.value)} />
      )}

      {field('Venue', <MapPin className="h-3 w-3" />,
        <input className="input w-full text-sm" placeholder="Hall name, building, address"
          value={value.venue} onChange={e => set('venue', e.target.value)} />
      )}

      {field('Google Map Link', <LinkIcon className="h-3 w-3" />,
        <input className="input w-full text-xs font-mono" placeholder="https://maps.google.com/…"
          value={value.mapLink} onChange={e => set('mapLink', e.target.value)} />
      )}

      {field('Registration Link', <LinkIcon className="h-3 w-3" />,
        <input className="input w-full text-xs font-mono" placeholder="https://…"
          value={value.registrationLink} onChange={e => set('registrationLink', e.target.value)} />
      )}

      <div className="grid grid-cols-2 gap-2">
        {field('Capacity (seats)', <Users className="h-3 w-3" />,
          <input type="number" min="0" className="input w-full text-sm"
            value={value.capacity} onChange={e => set('capacity', e.target.value)} />
        )}
        {field('Reg. Deadline', <Calendar className="h-3 w-3" />,
          <input type="date" className="input w-full text-sm"
            value={value.registrationDeadline} onChange={e => set('registrationDeadline', e.target.value)} />
        )}
      </div>

      {/* Free / Paid toggle */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => set('isFree', !value.isFree)}
            className={`relative h-5 w-9 rounded-full transition-colors ${value.isFree ? 'bg-green-500' : 'bg-orange-500'}`}
          >
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${value.isFree ? 'left-0.5' : 'left-4'}`} />
          </div>
          <span className="text-xs font-medium text-gray-600">{value.isFree ? '🆓 Free Event' : '💰 Paid Event'}</span>
        </label>
      </div>

      {!value.isFree && field('Price (₹)', <DollarSign className="h-3 w-3" />,
        <input type="number" min="0" step="0.01" className="input w-full text-sm" placeholder="0.00"
          value={value.price} onChange={e => set('price', e.target.value)} />
      )}

      {field('Banner Image URL', <Info className="h-3 w-3" />,
        <input className="input w-full text-xs font-mono" placeholder="https://… (wide banner)"
          value={value.bannerImage} onChange={e => set('bannerImage', e.target.value)} />
      )}
      {value.bannerImage && (
        <img src={value.bannerImage} alt="Banner preview"
          className="w-full rounded-lg object-cover" style={{ maxHeight: 80 }}
          onError={e => { e.currentTarget.style.display = 'none'; }} />
      )}
    </div>
  );
}
