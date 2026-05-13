import { Html5Qrcode } from 'html5-qrcode'

export function sanitizeQrMountDomId(raw: string): string {
  return `stellar-qr-${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`
}

export async function pickPreferredQrCamera(): Promise<string | MediaTrackConstraints> {
  try {
    const cameras = await Html5Qrcode.getCameras()
    if (cameras.length === 0) {
      return { facingMode: 'environment' }
    }
    const back = cameras.find((c) => /back|rear|environment|wide/i.test(c.label))
    return back?.id ?? cameras[0]!.id
  } catch {
    return { facingMode: 'environment' }
  }
}
