import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Tag, Btn } from '../multiplayer/ui';
import { SeoFor } from '../seo';
import { CampaignShell } from '../campaign/Shell';
import { ZoneBand, ZoneLink, MutatorLegend, MapSkeleton } from '../campaign/map';
import type { CampaignMap } from '../campaign/types';

const CampaignPage: React.FC = () => {
  const navigate = useNavigate();
  const [map, setMap] = useState<CampaignMap | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    axios.get<CampaignMap>('/campaign')
      .then(res => setMap(res.data))
      .catch(err => {
        // the route wrapper creates a guest before we get here, so a 401 is
        // unexpected - say what to do about it rather than leaking a raw error
        const status = err?.response?.status;
        setError(
          status === 401
            ? 'Your session expired. Reload the page to pick up a new guest session.'
            : err?.response?.data?.error || 'The server did not answer.',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const title = (
    <>
      The <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">Campaign</span>
    </>
  );

  const stats = map && (
    <>
      <Tag className="bg-yellow-300 dark:bg-black"><span aria-hidden="true">★ </span>{map.progress.totalStars}/{map.progress.maxStars} stars</Tag>
      <Tag className="bg-cyan-300 dark:bg-black">{map.zonesCleared}/{map.zones.length} zones</Tag>
    </>
  );

  const headerStats = map ? (
    <div className="hidden sm:flex items-center gap-2 font-mono text-sm font-black" style={{ fontVariantNumeric: 'tabular-nums' }}>
      {stats}
    </div>
  ) : undefined;

  return (
    <CampaignShell title={title} onBack={() => navigate('/dashboard')} right={headerStats}>
      <SeoFor path="/campaign" />
      <div className="max-w-6xl mx-auto space-y-2">
        {/* loading */}
        {!map && loading && <MapSkeleton />}

        {/* error, with a retry that re-runs the fetch */}
        {!map && !loading && (
          <div className="bg-white dark:bg-black border-4 border-black dark:border-yellow-400 p-4 sm:p-6 space-y-4 max-w-xl mx-auto mt-10">
            <p className="text-xl sm:text-2xl font-black uppercase">Could not load the campaign</p>
            <p className="font-mono text-sm font-bold break-words">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Btn color="bg-yellow-300" className="w-full sm:w-auto" onClick={load} disabled={loading}>
                {loading ? 'Retrying…' : 'Retry'}
              </Btn>
              <Btn className="w-full sm:w-auto" onClick={() => navigate('/dashboard')}>Back to dashboard</Btn>
            </div>
          </div>
        )}

        {map && (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <p className="font-mono text-sm font-bold">
                Twenty four nodes, four zones, one survivor. Each node twists the passage a different way. Earn a star to open the next one.
              </p>
              <div className="sm:hidden flex flex-wrap items-center gap-2 font-mono text-sm font-black" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {stats}
              </div>
              {map.allStars && <Tag className="bg-pink-300 dark:bg-black"><span aria-hidden="true">🌟 </span>Constellation: every star earned</Tag>}
            </div>

            {/* empty: the server answered but has no zones configured */}
            {map.zones.length === 0 ? (
              <div className="bg-white dark:bg-black border-4 border-black dark:border-yellow-400 p-4 sm:p-6 space-y-4 max-w-xl mx-auto mt-10">
                <p className="text-xl sm:text-2xl font-black uppercase">No zones yet</p>
                <p className="font-mono text-sm font-bold">
                  The campaign map came back empty. Try again in a moment, or play the daily challenge meanwhile.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Btn color="bg-yellow-300" className="w-full sm:w-auto" onClick={load} disabled={loading}>
                    {loading ? 'Retrying…' : 'Retry'}
                  </Btn>
                  <Btn className="w-full sm:w-auto" onClick={() => navigate('/daily')}>Daily challenge</Btn>
                </div>
              </div>
            ) : (
              map.zones.map((zone, i) => {
                const reverse = i % 2 === 1;
                return (
                  <React.Fragment key={zone.id}>
                    {i > 0 && <ZoneLink side={reverse ? 'right' : 'left'} />}
                    <ZoneBand zone={zone} reverse={reverse} onOpen={id => navigate(`/campaign/${id}`)} />
                  </React.Fragment>
                );
              })
            )}

            <div className="pt-6">
              <MutatorLegend />
            </div>
          </>
        )}
      </div>
    </CampaignShell>
  );
};

export default CampaignPage;
