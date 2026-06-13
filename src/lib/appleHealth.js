// Parse Apple Health XML export and extract relevant records
export async function parseAppleHealthXML(file) {
  const text = await file.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'text/xml')
  const records = Array.from(doc.querySelectorAll('Record'))

  const sleepLogs = []
  const heartMetrics = []

  for (const record of records) {
    const type = record.getAttribute('type')
    const startDate = record.getAttribute('startDate')
    const endDate = record.getAttribute('endDate')
    const value = record.getAttribute('value')

    if (type === 'HKCategoryTypeIdentifierSleepAnalysis' && value === 'HKCategoryValueSleepAnalysisAsleep') {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const durationHr = (end - start) / 3600000
      sleepLogs.push({
        date: start.toISOString().split('T')[0],
        bedtime: start.toTimeString().slice(0, 5),
        wake_time: end.toTimeString().slice(0, 5),
        sleep_hour: start.getHours() + start.getMinutes() / 60,
        wake_hour: end.getHours() + end.getMinutes() / 60,
        duration_hr: Math.round(durationHr * 10) / 10,
        quality: null,
        source: 'apple_health',
      })
    }

    if (type === 'HKQuantityTypeIdentifierRestingHeartRate') {
      heartMetrics.push({
        date: startDate.split(' ')[0],
        resting_hr: parseFloat(value),
        source: 'apple_health',
      })
    }

    if (type === 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN') {
      heartMetrics.push({
        date: startDate.split(' ')[0],
        hrv: parseFloat(value),
        source: 'apple_health',
      })
    }
  }

  return { sleepLogs, heartMetrics }
}
