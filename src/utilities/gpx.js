import Geo from '../utilities/geo'

export default class Gpx {
    static findNearestPoint(run, lat, lon) {
        var bestDistance
        var nearestPoint

        var desiredPoint = { latitude: lat, longitude: lon }
        run.points.forEach(pt => {
            let d = Geo.getDistance(pt.gpx, desiredPoint)
            if (!bestDistance || d < bestDistance) {
            bestDistance = d
            nearestPoint = pt
            }
        })

        return nearestPoint
    }
  
  
    static findTrackAndRun(tracks, point) {
        var response = null
        tracks.forEach(t => {
          t.runs.forEach(r => {
            if (point.gpx.time >= r.points[0].gpx.time && point.gpx.time <= r.points[r.points.length - 1].gpx.time) {
              response = { track: t, run: r }
            }
          })
        })
  
        return response
      }
  }
