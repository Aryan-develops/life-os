// Caffeine half-life ~5 hours. Returns hours until caffeine is <10% of peak.
export function caffeineActiveUntil(doseMg, timeTaken) {
  const halfLifeHours = 5
  const clearanceHours = halfLifeHours * Math.log2(doseMg / 10) // below 10mg equiv
  const taken = new Date(timeTaken)
  const clearAt = new Date(taken.getTime() + clearanceHours * 3600 * 1000)
  return clearAt
}

// Returns a simple alertness score (0-100) for a given hour of day based on sleep data
export function alertnessScore(hour, avgWakeHour, avgSleepHour) {
  // Peak alertness ~2-4hrs after wake, secondary peak ~8-10hrs after wake
  const hoursAwake = hour >= avgWakeHour ? hour - avgWakeHour : 24 - avgWakeHour + hour
  if (hoursAwake < 0) return 20
  if (hoursAwake < 1) return 50
  if (hoursAwake < 2) return 75
  if (hoursAwake <= 4) return 95  // peak morning
  if (hoursAwake <= 6) return 80
  if (hoursAwake <= 8) return 65  // post-lunch dip
  if (hoursAwake <= 10) return 85 // secondary peak
  if (hoursAwake <= 13) return 60
  return Math.max(10, 60 - (hoursAwake - 13) * 8) // winding down
}

export function recommendedBedtime(avgWakeHour, targetSleepHours = 8) {
  const bedHour = avgWakeHour - targetSleepHours
  return ((bedHour % 24) + 24) % 24
}

export function formatHour(h) {
  const hour = Math.floor(h)
  const min = Math.round((h - hour) * 60)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`
}

export function buildScheduleContext(sleepLogs, stimulants, gymSessions) {
  // Average wake/sleep times from last 7 days
  const recent = sleepLogs.slice(-7)
  const avgWake = recent.length
    ? recent.reduce((s, l) => s + parseFloat(l.wake_hour || 7), 0) / recent.length
    : 7
  const avgSleep = recent.length
    ? recent.reduce((s, l) => s + parseFloat(l.sleep_hour || 23), 0) / recent.length
    : 23
  const avgQuality = recent.length
    ? recent.reduce((s, l) => s + (l.quality || 7), 0) / recent.length
    : 7

  // Latest stimulants today
  const today = new Date().toISOString().split('T')[0]
  const todayStims = stimulants.filter(s => s.date === today)

  // Gym session times
  const gymHours = gymSessions.slice(-20).map(g => g.start_hour).filter(Boolean)
  const avgGymHour = gymHours.length
    ? gymHours.reduce((a, b) => a + b, 0) / gymHours.length
    : 17

  return { avgWake, avgSleep, avgQuality, todayStims, avgGymHour }
}
