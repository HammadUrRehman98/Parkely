import { ParkingSlot, SlotStatus } from '@/types/parking';
import { cn } from '@/lib/utils';
import { Car } from 'lucide-react';

export type LayoutTemplate = '2-row' | '4-row' | 'l-shaped' | 'grid';

interface ParkingLayoutProps {
  slots: ParkingSlot[];
  template: LayoutTemplate;
  selectedSlot?: string | null;
  onSlotClick?: (slotId: string) => void;
  interactive?: boolean;
  compact?: boolean;
}

const statusStyles: Record<SlotStatus, { bg: string; border: string; text: string }> = {
  available: {
    bg: 'bg-green-500/15',
    border: 'border-green-500',
    text: 'text-green-700 dark:text-green-400',
  },
  booked: {
    bg: 'bg-warning/15',
    border: 'border-warning',
    text: 'text-orange-700 dark:text-orange-400',
  },
  occupied: {
    bg: 'bg-destructive/15',
    border: 'border-destructive',
    text: 'text-destructive',
  },
};

const SlotCell = ({
  slot,
  selected,
  onClick,
  interactive,
  compact,
  rotated,
}: {
  slot: ParkingSlot;
  selected: boolean;
  onClick?: () => void;
  interactive?: boolean;
  compact?: boolean;
  rotated?: boolean;
}) => {
  const style = statusStyles[slot.status];
  const canClick = interactive && slot.status === 'available';
  const size = compact ? 'w-10 h-14' : 'w-14 h-20';

  return (
    <button
      disabled={!canClick}
      onClick={canClick ? onClick : undefined}
      className={cn(
        size,
        'rounded-md border-2 flex flex-col items-center justify-center gap-0.5 transition-all relative',
        style.bg,
        style.border,
        style.text,
        canClick && 'hover:scale-105 hover:shadow-md cursor-pointer',
        !canClick && !interactive && 'cursor-default',
        !canClick && interactive && 'cursor-not-allowed opacity-70',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 shadow-lg',
        rotated && 'rotate-180'
      )}
      title={`${slot.label} — ${slot.status}`}
    >
      {slot.status !== 'available' && (
        <Car className={cn('h-4 w-4', compact && 'h-3 w-3')} />
      )}
      <span className={cn('text-[10px] font-bold', compact && 'text-[8px]')}>
        {slot.label}
      </span>
    </button>
  );
};

const Aisle = ({ label, vertical }: { label?: string; vertical?: boolean }) => (
  <div
    className={cn(
      'flex items-center justify-center',
      vertical ? 'w-10 min-h-full' : 'h-8 w-full'
    )}
  >
    <div
      className={cn(
        'bg-muted rounded-sm flex items-center justify-center',
        vertical ? 'w-2 h-full' : 'h-1 w-full'
      )}
    />
    {label && (
      <span className="absolute text-[9px] text-muted-foreground font-medium uppercase tracking-wider">
        {label}
      </span>
    )}
  </div>
);

const Row = ({
  slots,
  selectedSlot,
  onSlotClick,
  interactive,
  compact,
  rotated,
}: {
  slots: ParkingSlot[];
  selectedSlot?: string | null;
  onSlotClick?: (id: string) => void;
  interactive?: boolean;
  compact?: boolean;
  rotated?: boolean;
}) => (
  <div className="flex gap-1.5 justify-center flex-wrap">
    {slots.map((slot) => (
      <SlotCell
        key={slot.id}
        slot={slot}
        selected={selectedSlot === slot.id}
        onClick={() => onSlotClick?.(slot.id)}
        interactive={interactive}
        compact={compact}
        rotated={rotated}
      />
    ))}
  </div>
);

function splitIntoRows(slots: ParkingSlot[], perRow: number): ParkingSlot[][] {
  const rows: ParkingSlot[][] = [];
  for (let i = 0; i < slots.length; i += perRow) {
    rows.push(slots.slice(i, i + perRow));
  }
  return rows;
}

export const ParkingLayout = ({
  slots,
  template,
  selectedSlot,
  onSlotClick,
  interactive = false,
  compact = false,
}: ParkingLayoutProps) => {
  const perRow = compact ? 8 : 10;

  const renderLegend = () => (
    <div className="flex gap-4 mb-4 justify-center">
      {(['available', 'booked', 'occupied'] as SlotStatus[]).map((s) => (
        <div key={s} className="flex items-center gap-1.5 text-xs">
          <div className={cn('h-3 w-3 rounded border-2', statusStyles[s].bg, statusStyles[s].border)} />
          <span className="capitalize text-muted-foreground">{s}</span>
        </div>
      ))}
    </div>
  );

  const render2Row = () => {
    const half = Math.ceil(slots.length / 2);
    const topSlots = slots.slice(0, half);
    const bottomSlots = slots.slice(half);
    const topRows = splitIntoRows(topSlots, perRow);
    const bottomRows = splitIntoRows(bottomSlots, perRow);

    return (
      <div className="space-y-1">
        {/* Entry marker */}
        <div className="flex justify-center mb-2">
          <div className="bg-primary/10 border border-primary/30 rounded-full px-4 py-1 text-[10px] font-medium text-primary uppercase tracking-wider">
            ↓ Entry
          </div>
        </div>
        {/* Top rows (cars face down) */}
        <div className="space-y-1.5 border-b-2 border-dashed border-muted-foreground/20 pb-3">
          {topRows.map((row, i) => (
            <Row key={`top-${i}`} slots={row} selectedSlot={selectedSlot} onSlotClick={onSlotClick} interactive={interactive} compact={compact} />
          ))}
        </div>
        {/* Aisle */}
        <div className="flex items-center justify-center py-2">
          <span className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase">— Driving Lane —</span>
        </div>
        {/* Bottom rows (cars face up) */}
        <div className="space-y-1.5 border-t-2 border-dashed border-muted-foreground/20 pt-3">
          {bottomRows.map((row, i) => (
            <Row key={`bot-${i}`} slots={row} selectedSlot={selectedSlot} onSlotClick={onSlotClick} interactive={interactive} compact={compact} rotated />
          ))}
        </div>
        {/* Exit marker */}
        <div className="flex justify-center mt-2">
          <div className="bg-destructive/10 border border-destructive/30 rounded-full px-4 py-1 text-[10px] font-medium text-destructive uppercase tracking-wider">
            ↑ Exit
          </div>
        </div>
      </div>
    );
  };

  const render4Row = () => {
    const quarter = Math.ceil(slots.length / 4);
    const sections = [
      slots.slice(0, quarter),
      slots.slice(quarter, quarter * 2),
      slots.slice(quarter * 2, quarter * 3),
      slots.slice(quarter * 3),
    ];

    return (
      <div className="space-y-1">
        <div className="flex justify-center mb-2">
          <div className="bg-primary/10 border border-primary/30 rounded-full px-4 py-1 text-[10px] font-medium text-primary uppercase tracking-wider">
            ↓ Entry
          </div>
        </div>
        {sections.map((section, si) => (
          <div key={si}>
            <div className={cn(
              'space-y-1.5 py-2',
              si % 2 === 1 && 'border-b-2 border-dashed border-muted-foreground/20 pb-3'
            )}>
              {splitIntoRows(section, perRow).map((row, ri) => (
                <Row key={`s${si}-${ri}`} slots={row} selectedSlot={selectedSlot} onSlotClick={onSlotClick} interactive={interactive} compact={compact} rotated={si % 2 === 1} />
              ))}
            </div>
            {si === 1 && (
              <div className="flex items-center justify-center py-2">
                <span className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase">— Driving Lane —</span>
              </div>
            )}
          </div>
        ))}
        <div className="flex justify-center mt-2">
          <div className="bg-destructive/10 border border-destructive/30 rounded-full px-4 py-1 text-[10px] font-medium text-destructive uppercase tracking-wider">
            ↑ Exit
          </div>
        </div>
      </div>
    );
  };

  const renderLShaped = () => {
    const verticalCount = Math.ceil(slots.length * 0.4);
    const horizontalCount = slots.length - verticalCount;
    const verticalSlots = slots.slice(0, verticalCount);
    const horizontalSlots = slots.slice(verticalCount);
    const vRows = splitIntoRows(verticalSlots, Math.min(5, perRow));
    const hRows = splitIntoRows(horizontalSlots, perRow);

    return (
      <div className="space-y-2">
        <div className="flex justify-start mb-2">
          <div className="bg-primary/10 border border-primary/30 rounded-full px-4 py-1 text-[10px] font-medium text-primary uppercase tracking-wider">
            ↓ Entry
          </div>
        </div>
        {/* Vertical section (left wing) */}
        <div className="flex gap-4">
          <div className="space-y-1.5 border-r-2 border-dashed border-muted-foreground/20 pr-4">
            {vRows.map((row, i) => (
              <Row key={`v-${i}`} slots={row} selectedSlot={selectedSlot} onSlotClick={onSlotClick} interactive={interactive} compact={compact} />
            ))}
          </div>
          <div className="flex items-center">
            <span className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase writing-mode-vertical rotate-90 whitespace-nowrap">Lane</span>
          </div>
        </div>
        {/* Corner */}
        <div className="border-t-2 border-dashed border-muted-foreground/20 pt-2" />
        {/* Horizontal section (bottom wing) */}
        <div className="space-y-1.5">
          {hRows.map((row, i) => (
            <Row key={`h-${i}`} slots={row} selectedSlot={selectedSlot} onSlotClick={onSlotClick} interactive={interactive} compact={compact} />
          ))}
        </div>
        <div className="flex justify-end mt-2">
          <div className="bg-destructive/10 border border-destructive/30 rounded-full px-4 py-1 text-[10px] font-medium text-destructive uppercase tracking-wider">
            Exit →
          </div>
        </div>
      </div>
    );
  };

  const renderGrid = () => {
    const rows = splitIntoRows(slots, perRow);
    return (
      <div className="space-y-1.5">
        <div className="flex justify-center mb-2">
          <div className="bg-primary/10 border border-primary/30 rounded-full px-4 py-1 text-[10px] font-medium text-primary uppercase tracking-wider">
            ↓ Entry
          </div>
        </div>
        {rows.map((row, i) => (
          <Row key={i} slots={row} selectedSlot={selectedSlot} onSlotClick={onSlotClick} interactive={interactive} compact={compact} />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-muted/30 border border-border rounded-lg p-4">
      {renderLegend()}
      {template === '2-row' && render2Row()}
      {template === '4-row' && render4Row()}
      {template === 'l-shaped' && renderLShaped()}
      {template === 'grid' && renderGrid()}
      <div className="mt-3 text-center text-[10px] text-muted-foreground">
        {slots.filter((s) => s.status === 'available').length} / {slots.length} slots available
      </div>
    </div>
  );
};

export const layoutTemplates: { value: LayoutTemplate; label: string; description: string }[] = [
  { value: '2-row', label: '2-Row Facing', description: 'Two rows facing a central driving lane' },
  { value: '4-row', label: '4-Row Double', description: 'Four rows with two driving lanes' },
  { value: 'l-shaped', label: 'L-Shaped', description: 'Corner layout with vertical and horizontal sections' },
  { value: 'grid', label: 'Open Grid', description: 'Simple open grid arrangement' },
];
