export function extractGoogleDriveFolderId(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (!trimmed.includes('drive.google.com')) {
    return trimmed;
  }

  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);

  if (folderMatch?.[1]) {
    return folderMatch[1];
  }

  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);

  if (idMatch?.[1]) {
    return idMatch[1];
  }

  return null;
}