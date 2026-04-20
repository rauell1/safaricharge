const EXTERNAL_UPLOAD_FLAG = 'safaricharge-external-upload-active';

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function markExternalUploadActive(active: boolean) {
  if (!canUseSessionStorage()) return;

  try {
    if (active) {
      window.sessionStorage.setItem(EXTERNAL_UPLOAD_FLAG, '1');
    } else {
      window.sessionStorage.removeItem(EXTERNAL_UPLOAD_FLAG);
    }
  } catch {
    // Ignore storage failures in restricted contexts.
  }
}

export function clearExternalUploadActive() {
  markExternalUploadActive(false);
}

export function isExternalUploadActive() {
  if (!canUseSessionStorage()) return false;

  try {
    return window.sessionStorage.getItem(EXTERNAL_UPLOAD_FLAG) === '1';
  } catch {
    return false;
  }
}
