export const MAX_USER_STORAGE_BYTES = 100 * 1024; // 100KB

function isLikelyBase64Image(s: unknown) {
  return typeof s === 'string' && (s.startsWith('data:') || s.length > 2000);
}

function stripLargeFields(user: any) {
  if (!user || typeof user !== 'object') return user;
  const copy: any = {};
  // Keep only essential fields first
  const keep = ['id', 'name', 'phone', 'role', 'email', 'address'];
  keep.forEach((k) => { if (user[k] !== undefined) copy[k] = user[k]; });

  // Small profile metadata: prefer URL over embedded data
  if (user.avatar_url && typeof user.avatar_url === 'string' && !isLikelyBase64Image(user.avatar_url)) copy.avatar_url = user.avatar_url;
  if (user.profilePicture && typeof user.profilePicture === 'string' && !isLikelyBase64Image(user.profilePicture)) copy.profilePicture = user.profilePicture;

  return copy;
}

export function compactUserForStorage(user: any) {
  if (!user) return {};
  // Start with stripped user
  let candidate = stripLargeFields(user);
  let str = JSON.stringify(candidate);
  let size = new TextEncoder().encode(str).length;

  // If still too large, remove optional small fields
  if (size > MAX_USER_STORAGE_BYTES) {
    delete candidate.profilePicture;
    delete candidate.avatar_url;
    str = JSON.stringify(candidate);
    size = new TextEncoder().encode(str).length;
  }

  // If still too large, fall back to minimal set
  if (size > MAX_USER_STORAGE_BYTES) {
    candidate = { id: candidate.id || '', name: candidate.name || '', phone: candidate.phone || '', role: candidate.role || '' };
    str = JSON.stringify(candidate);
    size = new TextEncoder().encode(str).length;
  }

  return { payload: candidate, json: str, bytes: size };
}

export function saveUserToLocalStorage(user: any) {
  try {
    const { json } = compactUserForStorage(user);
    try {
      // Log size for diagnostics
      const bytes = new TextEncoder().encode(json).length;
      console.debug(`[storage] roundu_user size ${bytes} bytes`);
      localStorage.setItem('roundu_user', json);
      return true;
    } catch (err) {
      console.error('Failed to set roundu_user in localStorage', err);
      return false;
    }
  } catch (err) {
    console.error('Failed to compact and save user', err);
    return false;
  }
}

export function safeSetItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.error(`localStorage.setItem failed for ${key}`, e);
    return false;
  }
}
