import Geo from '../utilities/geo'
import sprintf from 'sprintf-js'

export default class MapPopupFormatter {
  static overview (transportationMap, stoppedDuration, discardedCount, tracks) {
    let lastTrack = tracks[tracks.length - 1]
    let lastRun = lastTrack.runs[lastTrack.runs.length - 1]
    let transportation = MapPopupFormatter.formatTransporation(transportationMap, 'foot', 'On foot for') +
        MapPopupFormatter.formatTransporation(transportationMap, 'bicycle', 'On a bicycle for') +
        MapPopupFormatter.formatTransporation(transportationMap, 'car', 'In a vehicle for') +
        MapPopupFormatter.formatTransporation(transportationMap, 'train', 'On a train for') +
        MapPopupFormatter.formatTransporation(transportationMap, 'plane', 'On an airplane for')
    let stopped = sprintf.sprintf('Stopped for %s <br>', Geo.displayableDuration(stoppedDuration * 1000))

    let discarded = sprintf.sprintf('%d points were discarded', discardedCount)
    if (discardedCount === 0) {
        discarded = 'No points were discarded'
    }

    let startTime = MapPopupFormatter.getDisplayableTimestamp(tracks[0].runs[0].points[0].gpx.time, lastRun.timezoneInfo)
    let endTime = MapPopupFormatter.getDisplayableTimestamp(lastRun.points[lastRun.points.length - 1].gpx.time, lastRun.timezoneInfo)
    return sprintf.sprintf(
        'GPX Overview <br>There %s %d track%s <br>' +
        'From %s, %s - %s %s <br>' +
        transportation + stopped + discarded,
        tracks.length === 1 ? 'is' : 'are',
        tracks.length,
        tracks.length === 1 ? '' : 's',
        startTime.date,
        startTime.time,
        endTime.time,
        startTime.tag)
  }

  static formatTransporation (map, key, prefix) {
    if (key in map) {
      let val = map[key]
      return sprintf.sprintf('%s %f miles (%f km), %s <br>', 
        prefix, 
        Geo.displayableDistance(Geo.kilometersToMiles(val.kilometers)),
        Geo.displayableDistance(val.kilometers),
        Geo.displayableDuration(val.seconds * 1000))
    }
    return ''
  }

  static stop (track, stop) {
    let type = stop.style === 'stopped' ? 'Stopped' : 'Paused'
    let startTime = MapPopupFormatter.getDisplayableTimestamp(stop.startTime, track.runs[0].timezoneInfo)
    let endTime = MapPopupFormatter.getDisplayableTimestamp(stop.endTime, track.runs[0].timezoneInfo)

    return sprintf.sprintf(
      '%s, %s %s <br>' +   // timestamp
      '%f,%f <br>' +    // lat,lon
      '<b>%s</b> for %s <br>Start: %s, %s %s<br>End: %s, %s <br>' +
      'distance: %f meters',
      startTime.date,
      startTime.time,
      startTime.tag,
      stop.latitude,
      stop.longitude,
      type,
      Geo.displayableDuration(stop.durationSeconds * 1000),
      startTime.date,
      startTime.time,
      startTime.tag,
      endTime.date,
      endTime.time,
      Geo.displayableDistance(stop.distance * 1000))
  }

  static runInfo (currentTrackNum, currentRunNum, run) {
    let startTime = MapPopupFormatter.getDisplayableTimestamp(run.points[0].gpx.time, run.timezoneInfo)
    let lastTime = MapPopupFormatter.getDisplayableTimestamp(run.points[run.points.length - 1].gpx.time, run.timezoneInfo)
    let distance = Geo.displayableDistance(Geo.kilometersToMiles(run.kilometers))
    let speed = (distance / (run.seconds / 3600)).toFixed(2)
    return sprintf.sprintf(
      'Track %d, run %d <br>' +
      '%s, %s - %s %s <br>' +   // timestamp
      'Transportation: <b>%s</b> (%d%%) <br>' +
      'Distance: %f miles (%f km) <br>Time: %s <br>' +
      'Average speed: %f mph <br>' +
      'Data points: %d',
      currentTrackNum,
      currentRunNum,
      startTime.date,
      startTime.time,
      lastTime.time,
      startTime.tag,
      run.speedTypes[0].transportation,
      run.speedTypes[0].probability * 100,
      distance,
      Geo.displayableDistance(run.kilometers),
      Geo.displayableDuration((run.seconds) * 1000),
      speed,
      run.points.length)
  }

  static runPoint (run, point) {
    let dateTime = MapPopupFormatter.getDisplayableTimestamp(point.gpx.time, run.timezoneInfo)
    return sprintf.sprintf(
      '%s, %s %s <br>' +   // timestamp
      '%f,%f <br>' +    // lat,lon
      'Transportation: <br> <div class="gpx-info-tab">run: <b>%s</b> (%d%%)</div> <div class="gpx-info-tab">point: <b>%s</b> (%d%%)</div>' +
      'From start: %f miles (%f km), %s <br>' +
      'Speed: %f mph, smoothed: %f mph <br>HDOP: %f; PDOP: %f <br>This run is %f miles (%f km), %s <br>' +
      'Bearing: %d degrees',
      dateTime.date,
      dateTime.time,
      dateTime.tag,
      point.gpx.latitude,
      point.gpx.longitude,
      run.speedTypes[0].transportation,
      run.speedTypes[0].probability * 100,
      point.speedTypes[0].transportation,
      point.speedTypes[0].probability * 100,
      Geo.displayableDistance(Geo.kilometersToMiles(run.trackOffsetKilometers + point.kilometersIntoRun)),
      Geo.displayableDistance(run.trackOffsetKilometers + point.kilometersIntoRun),
      Geo.displayableDuration((run.trackOffsetSeconds + point.secondsIntoRun) * 1000),
      Geo.kilometersPerHourToMilesPerhHour(point.gpx.speedKmH).toFixed(2),
      Geo.kilometersPerHourToMilesPerhHour(point.smoothedSpeedKmH).toFixed(2),
      point.gpx.hdop || 0,
      point.gpx.pdop || 0,
      Geo.displayableDistance(Geo.kilometersToMiles(run.kilometers)),
      Geo.displayableDistance(run.kilometers),
      Geo.displayableDuration((run.seconds) * 1000),
      point.calculatedBearing || -1)
  }

  static original (timezoneInfo, point) {
    let timestamp = MapPopupFormatter.getDisplayableTimestamp(point.time, timezoneInfo)
    return sprintf.sprintf(
      '%s, %s %s<br>' +   // timestamp
      '%f,%f <br>' +    // lat,lon
      'speed: %f mph (%f) <br>' +
      'course: %d',
      timestamp.date,
      timestamp.time,
      timestamp.tag,
      point.latitude,
      point.longitude,
      Geo.kilometersPerHourToMilesPerhHour(point.speedKmH).toFixed(2),
      point.speed,
      point.course)
  }

  static discarded (track, point) {
    let time = MapPopupFormatter.getDisplayableTimestamp(point.gpx.time, track.runs[0].timezoneInfo)
    return sprintf.sprintf(
      '%s, %s %s <br>' +   // timestamp
      '%f,%f <br>' +    // lat,lon
      '<b>Discarded: %s</b> <br>Fix: %s <br>HDOP: %f <br>PDOP: %f',
      time.date,
      time.time,
      time.tag,
      point.gpx.latitude,
      point.gpx.longitude,
      point.reason,
      point.gpx.fix || '',
      point.gpx.hdop || 0.0,
      point.gpx.pdop || 0.0)
  }

  static getDisplayableTimestamp (timestamp, timezoneInfo) {
    let date = new Date(timestamp)
    return { 
      date: date.toDateString("en-US", {timeZone: timezoneInfo.id}),
      time: date.toLocaleTimeString("en-US", {timeZone: timezoneInfo.id}),
      tag: timezoneInfo.tag 
    }
  }
}
