import React from 'react';
import { brutal, Tag } from '../multiplayer/ui';
import { MUTATOR_INFO, MUTATOR_KEYS, MutatorTags } from './mutators';
import type { NodeSummary, ZoneSummary } from './types';

export const ZONE_COLORS = ['bg-green-300', 'bg-orange-300', 'bg-purple-300', 'bg-pink-300'];
export const zoneColor = (zoneId: number) => ZONE_COLORS[(zoneId - 1) % ZONE_COLORS.length];

export const Stars: React.FC<{ n: number; className?: string }> = ({ n, className = '' }) => (
  <span className={`font-mono tracking-tight ${className}`} aria-label={`${n} of 3 stars`}>
    {[0, 1, 2].map(i => (
      <span key={i} className={i < n ? 'text-black dark:text-yellow-400' : 'text-gray-400 dark:text-yellow-400/30'}>
        {i < n ? '★' : '☆'}
      </span>
    ))}
  </span>
);

export const NodeTile: React.FC<{ node: NodeSummary; color: string; onOpen: (id: string) => void }> = ({ node, color, onOpen }) => {
  const locked = !node.unlocked;
  const size = node.boss ? 'w-36 h-36' : 'w-28 h-28';
  return (
    <button
      type="button"
      disabled={locked}
      onClick={() => onOpen(node.id)}
      title={locked ? 'Locked. Clear the previous node first.' : `${node.name}: ${node.blurb}`}
      className={`relative shrink-0 ${size} ${brutal.border} flex flex-col items-center justify-center text-center p-1 transition-all ${
        locked
          ? 'bg-gray-200 dark:bg-black text-gray-500 dark:text-yellow-400/40 cursor-not-allowed'
          : `${color} dark:bg-black text-black dark:text-yellow-400 ${brutal.shadowSm} ${brutal.hover} ${brutal.active}`
      }`}
    >
      <span className="absolute top-1 left-1 font-mono text-[10px] font-black">{node.zone}.{node.index}</span>
      {node.boss && <span className="absolute top-0 right-1 font-mono text-[10px] font-black uppercase">Boss</span>}
      {locked ? (
        <span className="text-3xl">🔒</span>
      ) : node.boss ? (
        <span className="text-4xl leading-none">💀</span>
      ) : (
        <MutatorTags mutators={node.mutators} iconsOnly className="justify-center text-xl" />
      )}
      <span className={`font-black uppercase leading-tight mt-1 ${node.boss ? 'text-sm' : 'text-[11px]'} line-clamp-2`}>{node.name}</span>
      {node.boss && !locked && <MutatorTags mutators={node.mutators} iconsOnly className="justify-center text-sm" />}
      <Stars n={node.stars} className={`mt-1 ${node.boss ? 'text-lg' : 'text-sm'}`} />
    </button>
  );
};

const Connector: React.FC = () => (
  <div className="h-8 md:h-0 md:flex-1 md:min-w-[12px] border-l-4 md:border-l-0 md:border-t-4 border-dashed border-black dark:border-yellow-400 self-center" />
);

export const ZoneBand: React.FC<{ zone: ZoneSummary; reverse: boolean; onOpen: (id: string) => void }> = ({ zone, reverse, onOpen }) => {
  const color = zoneColor(zone.id);
  const stars = zone.nodes.reduce((s, n) => s + n.stars, 0);
  const open = zone.nodes.some(n => n.unlocked);
  return (
    <section className={`bg-white dark:bg-black ${brutal.border} ${brutal.shadow} p-4 md:p-6 ${open ? '' : 'opacity-70'}`}>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Tag className={`${color} dark:bg-black text-base`}>Zone {zone.id}</Tag>
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">{zone.name}</h2>
        {zone.cleared && <Tag className="bg-green-300 dark:bg-black">✓ Cleared</Tag>}
        {!open && <Tag>🔒 Locked</Tag>}
        <span className="ml-auto font-mono text-sm font-black" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {stars}/{zone.nodes.length * 3} ★
        </span>
      </div>
      <p className="font-mono text-sm font-bold mb-5 text-gray-600 dark:text-yellow-400/70">{zone.blurb}</p>
      <div className={`flex flex-col md:flex-row ${reverse ? 'md:flex-row-reverse' : ''} items-center`}>
        {zone.nodes.map((n, i) => (
          <React.Fragment key={n.id}>
            {i > 0 && <Connector />}
            <NodeTile node={n} color={color} onOpen={onOpen} />
          </React.Fragment>
        ))}
      </div>
    </section>
  );
};

/** Dashed vertical link between two zone bands; sits on the side where the path continues. */
export const ZoneLink: React.FC<{ side: 'left' | 'right' }> = ({ side }) => (
  <div className={`flex justify-center ${side === 'right' ? 'md:justify-end md:pr-20' : 'md:justify-start md:pl-20'}`}>
    <div className="h-10 border-l-4 border-dashed border-black dark:border-yellow-400" />
  </div>
);

export const MutatorLegend: React.FC = () => (
  <section className={`bg-white dark:bg-black ${brutal.border} ${brutal.shadowSm} p-4 md:p-6`}>
    <p className="font-black uppercase text-xs tracking-widest mb-3">Mutators</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {MUTATOR_KEYS.map(k => (
        <div key={k} className="flex gap-3 items-start">
          <span className="text-2xl leading-none w-8 text-center">{MUTATOR_INFO[k].icon}</span>
          <div>
            <p className="font-black uppercase text-sm leading-tight">{MUTATOR_INFO[k].name}</p>
            <p className="font-mono text-xs font-bold text-gray-600 dark:text-yellow-400/70">{MUTATOR_INFO[k].blurb}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
);
