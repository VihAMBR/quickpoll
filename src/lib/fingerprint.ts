import FingerprintJS from '@fingerprintjs/fingerprintjs'

let cachedFingerprint: string | null = null

export async function getDeviceFingerprint(): Promise<string> {
  if (cachedFingerprint) {
    return cachedFingerprint
  }

  // Initialize an agent at application startup.
  const fpPromise = FingerprintJS.load()
  
  // Get the visitor identifier when you need it.
  const fp = await fpPromise
  const result = await fp.get()
  
  // This is the visitor identifier:
  cachedFingerprint = result.visitorId
  return cachedFingerprint
}
