import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Tag } from '../multiplayer/ui';
import { CampaignShell } from '../campaign/Shell';
import { ZoneBand, ZoneLink, MutatorLegend } from '../campaign/map';
import type { CampaignMap } from '../campaign/types';

const CampaignPage: React.FC = () => {
  const navigate = useNavigate();
  const [map, setMap] = useState<CampaignMap | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Campaign — Typocalypse';
    return () => { document.title = 'Typocalypse — survive the typing apocalypse'; };
  }, []);

  useEffect(() => {
    axios.get<CampaignMap>('/campaign')
      .then(res => setMap(res.data))
      .catch(err => setError(err?.response?.data?.error || 'Could not load the campaign map'));
  }, []);

  const title = (
    <>
      The <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">Campaign</span>
    </>
  );

  if (!map) {
    return (
      <CampaignShell title={title} onBack={() => navigate('/dashboard')}>
        <p className="text-center mt-20 font-mono font-black animate-pulse">{error || 'UNROLLING THE MAP…'}</p>
      </CampaignShell>
    );
  }

  const headerStats = (
    <div className="hidden sm:flex items-center gap-2 font-mono text-sm font-black" style={{ fontVariantNumeric: 'tabular-nums' }}>
      <Tag className="bg-yellow-300 dark:bg-black">★ {map.progress.totalStars}/{map.progress.maxStars}</Tag>
      <Tag className="bg-cyan-300 dark:bg-black">{map.zonesCleared}/{map.zones.length} zones</Tag>
    </div>
  );

  return (
    <CampaignShell title={title} onBack={() => navigate('/dashboard')} right={headerStats}>
      <div className="max-w-6xl mx-auto space-y-2">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <p className="font-mono text-sm font-bold">
            Twenty four nodes, four zones, one survivor. Each node twists the passage a different way. Earn a star to open the next one.
          </p>
          <div className="sm:hidden flex items-center gap-2 font-mono text-sm font-black" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <Tag className="bg-yellow-300 dark:bg-black">★ {map.progress.totalStars}/{map.progress.maxStars}</Tag>
            <Tag className="bg-cyan-300 dark:bg-black">{map.zonesCleared}/{map.zones.length} zones</Tag>
          </div>
          {map.allStars && <Tag className="bg-pink-300 dark:bg-black">🌟 Constellation: every star earned</Tag>}
        </div>

        {map.zones.map((zone, i) => {
          const reverse = i % 2 === 1;
          return (
            <React.Fragment key={zone.id}>
              {i > 0 && <ZoneLink side={reverse ? 'right' : 'left'} />}
              <ZoneBand zone={zone} reverse={reverse} onOpen={id => navigate(`/campaign/${id}`)} />
            </React.Fragment>
          );
        })}

        <div className="pt-6">
          <MutatorLegend />
        </div>
      </div>
    </CampaignShell>
  );
};

export default CampaignPage;
