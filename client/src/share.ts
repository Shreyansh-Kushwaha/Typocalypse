import axios from 'axios';

// Copy a ghost challenge link; pinning first so pruning never kills the link.
export async function copyGhostLink(ghostId: string): Promise<boolean> {
  axios.post(`/ghosts/${ghostId}/pin`).catch(() => {});
  return copyText(`${window.location.origin}/ghost/${ghostId}`);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // clipboard API can be unavailable (http, permissions) - fall back
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
