import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Btn } from '../multiplayer/ui';
import { sfx } from '../sound';

export interface FollowCounts { followers: number; following: number }

// Follow / Unfollow toggle. Renders nothing on my own name. A visitor with no
// account gets a guest identity minted on the first click so it just works.
export const FollowButton: React.FC<{
  username: string;
  /** whether I already follow them, when known */
  following?: boolean;
  small?: boolean;
  className?: string;
  /** called with the new state and the TARGET's fresh follower/following counts */
  onChange?: (following: boolean, counts: FollowCounts) => void;
}> = ({ username, following: initial, small, className = '', onChange }) => {
  const { user, guestLogin } = useAuth();
  const [following, setFollowing] = useState(!!initial);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setFollowing(!!initial); }, [initial, username]);

  if (user && user.username === username) return null;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!user) await guestLogin();
      const path = `/social/follow/${encodeURIComponent(username)}`;
      const res = following ? await axios.delete(path) : await axios.post(path);
      setFollowing(!!res.data.following);
      if (res.data.following) sfx.pop();
      onChange?.(!!res.data.following, res.data.counts);
    } catch {
      // leave the button where it was; the next click retries
    } finally {
      setBusy(false);
    }
  };

  return (
    <Btn
      color={following ? 'bg-white' : 'bg-pink-300'}
      className={`${small ? 'text-xs py-1 px-2' : ''} ${className}`}
      onClick={toggle}
      disabled={busy}
      title={following ? `Unfollow ${username}` : `Follow ${username}`}
    >
      {following ? '✓ Following' : '+ Follow'}
    </Btn>
  );
};

export default FollowButton;
