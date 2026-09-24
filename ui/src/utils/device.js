/**
 * Device identification and persistent guest session utilities.
 */

/**
 * Retrieves or generates a persistent device serial identifier.
 * Persists across localStorage and a resilient 1-year cookie fallback.
 */
export const getDeviceSerial = () => {
  if (typeof window === 'undefined') {
    return 'guest_dev_' + Math.random().toString(36).slice(2)
  }

  // 1. Check localStorage first
  let serial = null
  try {
    serial = localStorage.getItem('qrchive_device_serial')
  } catch (e) {
    console.warn('[Device] Could not read device serial from localStorage:', e)
  }

  // 2. Fallback to cookie if localStorage was cleared
  if (!serial && typeof document !== 'undefined') {
    try {
      const match = document.cookie.match(/(?:^|; )qrchive_device_serial=([^;]*)/)
      if (match) {
        serial = decodeURIComponent(match[1])
      }
    } catch (e) {
      console.warn('[Device] Could not read device serial from cookie:', e)
    }
  }

  // 3. Generate new identifier if not found in any storage
  if (!serial) {
    let randomPart = ''
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      randomPart = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
    } else {
      randomPart = Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
    }

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : ''
    let platformPrefix = 'dev'
    if (/iPhone|iPad|iPod/i.test(ua)) platformPrefix = 'ios'
    else if (/Android/i.test(ua)) platformPrefix = 'and'
    else if (/Windows NT/i.test(ua)) platformPrefix = 'win'
    else if (/Macintosh|Mac OS X/i.test(ua)) platformPrefix = 'mac'
    else if (/Linux/i.test(ua)) platformPrefix = 'lin'

    serial = `${platformPrefix}_${randomPart}`

    // Persist to localStorage
    try {
      localStorage.setItem('qrchive_device_serial', serial)
    } catch (e) {}

    // Persist to Cookie (1 year duration)
    try {
      if (typeof document !== 'undefined') {
        document.cookie = `qrchive_device_serial=${encodeURIComponent(serial)}; path=/; max-age=31536000; SameSite=Lax`
      }
    } catch (e) {}
  } else {
    // If present in one storage but absent in the other, sync them
    try {
      if (!localStorage.getItem('qrchive_device_serial')) {
        localStorage.setItem('qrchive_device_serial', serial)
      }
    } catch (e) {}
    try {
      if (typeof document !== 'undefined' && !document.cookie.includes('qrchive_device_serial=')) {
        document.cookie = `qrchive_device_serial=${encodeURIComponent(serial)}; path=/; max-age=31536000; SameSite=Lax`
      }
    } catch (e) {}
  }

  return serial
}

/**
 * Extracts human-readable device platform and browser name
 */
export const getDeviceName = () => {
  if (typeof navigator === 'undefined') return 'Web Browser'
  const ua = navigator.userAgent || ''
  let os = 'Unknown Device'
  if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS Device'
  else if (/Android/i.test(ua)) os = 'Android Device'
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS'
  else if (/Windows NT/i.test(ua)) os = 'Windows PC'
  else if (/Linux/i.test(ua)) os = 'Linux PC'

  let browser = 'Browser'
  if (/Chrome|CriOS/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome'
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari'
  else if (/Firefox|FxiOS/i.test(ua)) browser = 'Firefox'
  else if (/Edg/i.test(ua)) browser = 'Edge'

  return `${os} (${browser})`
}

/**
 * Gets guest session for a specific event token or ID from local multi-event storage.
 * @param {string|number} eventCode 
 */
export const getStoredEventSession = (eventCode) => {
  if (typeof localStorage === 'undefined' || !eventCode) return null
  const codeStr = String(eventCode)
  if (codeStr === 'demo-event') return null

  // 1. Check currentEvent if matching
  try {
    const rawCurrent = localStorage.getItem('currentEvent')
    if (rawCurrent) {
      const parsed = JSON.parse(rawCurrent)
      if (parsed && String(parsed.eventCode) === codeStr) {
        return parsed
      }
    }
  } catch (e) {}

  // 2. Check multi-event dictionary
  try {
    const rawSessions = localStorage.getItem('qrchive_event_sessions')
    if (rawSessions) {
      const sessions = JSON.parse(rawSessions)
      if (sessions && sessions[codeStr]) {
        return sessions[codeStr]
      }
    }
  } catch (e) {}

  return null
}

/**
 * Saves guest session data into 'currentEvent' and 'qrchive_event_sessions'.
 * Explicitly skips saving into 'qrchive_event_sessions' if eventCode is 'demo-event'.
 * @param {string|number} eventCode 
 * @param {object} sessionData 
 */
export const saveStoredEventSession = (eventCode, sessionData) => {
  if (typeof localStorage === 'undefined' || !sessionData) return
  const codeStr = String(eventCode || sessionData.eventCode || '')

  try {
    localStorage.setItem('currentEvent', JSON.stringify(sessionData))
  } catch (e) {}

  // Never store demo-event into the persistent multi-event sessions dictionary
  if (codeStr === 'demo-event') {
    try {
      const rawSessions = localStorage.getItem('qrchive_event_sessions')
      if (rawSessions) {
        const sessions = JSON.parse(rawSessions)
        if (sessions && sessions['demo-event']) {
          delete sessions['demo-event']
          localStorage.setItem('qrchive_event_sessions', JSON.stringify(sessions))
        }
      }
    } catch (e) {}
    return
  }

  if (codeStr) {
    try {
      const rawSessions = localStorage.getItem('qrchive_event_sessions')
      const sessions = rawSessions ? JSON.parse(rawSessions) : {}
      sessions[codeStr] = sessionData
      localStorage.setItem('qrchive_event_sessions', JSON.stringify(sessions))
    } catch (e) {}
  }
}
