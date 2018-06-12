<template>
    <div class='trackMap' id='map'>
    </div>
</template>


<script>
import { mapState } from 'vuex'
import Geo from '../utilities/geo'
import Leaflet from 'leaflet'
import sprintf from 'sprintf-js'
import '../leaflet-controls/GpxInfoControl'

export default {
  name: 'Map',

  data () {
    return {
      map: null,
      mapLayersControl: null,
      mapMarker: null,
      gpxInfoControl: null,
      highlightedRunLine: null,
      startIcon: null,
      endIcon: null,
      currentlySelectedPoint: null
    }
  },

  computed: mapState([
    'selectedPoint',
    'stats'
  ]),

  watch: {
    stats () {
      let geoEpsilon = 0.002
      this.map.fitBounds([
          [this.stats.minLat - geoEpsilon, this.stats.minLon - geoEpsilon], 
          [this.stats.maxLat + geoEpsilon, this.stats.maxLon + geoEpsilon]])
      this.statsAdded()
    },

    selectedPoint () {
      if (this.currentlySelectedPoint !== this.selectedPoint) {
        this.currentlySelectedPoint = this.selectedPoint
        let trackAndRun = this.findTrackAndRun(this.currentlySelectedPoint)
        if (trackAndRun) {
          this.showRunPopup(trackAndRun.run, this.currentlySelectedPoint)
        }
      }
    }
  },

  methods: {
    statsAdded: function () {
      this.clearMap()

      // There are 0 to many tracks, each with
      //    0 to many runs
      //    0 to many discarded points
      //    0 to many stops
      // Map all runs as one layer & the discarded points & stops as seperate layers
      var trackNumber = 1
      this.stats.tracks.forEach(t => {
        this.addRuns(t, trackNumber)
        this.addStops(t, trackNumber)
        this.addDiscarded(t, trackNumber)
        trackNumber += 1
      })
    },

    addRuns: function (track, trackNumber) {
      var trackRuns = []
      track.runs.forEach(r => {
        var runLatLngList = r.points.map(p => {
            var ll = new Leaflet.LatLng(p.gpx.latitude, p.gpx.longitude)
            ll.meta = { point: p }
            return ll
        })

        var color = this.runColor(r)
        var weight = 3
        var lineCap = 'square'
        var lineJoin = 'miter'
        var dashArray = ''
        var opacity = 1.0
        if (r.style === 'virtual') {
          opacity = 0.6
          dashArray = '5 10'
        }

        switch (r.speedTypes[0].transportation) {
          case 'unknown':
            dashArray = '2 2'
            break
          case 'car':
            dashArray = '2 2'
            break
          case 'train':
            dashArray = '3 3'
            break
        }

        var runLine = new Leaflet.Polyline(
          runLatLngList,
          { color: color, weight: weight, clickable: true, lineCap: lineCap, lineJoin: lineJoin, dashArray: dashArray, opacity: opacity })
        runLine.run = r
        runLine.on('click', e => {
          this.runLinePopup(track, r, e.latlng)
          this.highlightRunLine(runLine)
          e.originalEvent._gpxHandled = true
          e.originalEvent.stopImmediatePropagation()
        })

        trackRuns.push(runLine)
      })
      var runLayer = new Leaflet.FeatureGroup(trackRuns)
      runLayer.track = track
      runLayer.addTo(this.map)
      this.addToMapLayersControl(runLayer, '#' + trackNumber + ' runs')
    },

    runColor: function (run) {
      var color = 'blue'
      switch (run.speedTypes[0].transportation) {
        case 'unknown':
          color = 'red'
          break
        case 'foot':
          color = '#0000FF'
          break
        case 'bicycle':
          color = '#3399CC'
          break
        case 'car':
          color = '#333333'
          break
        case 'train':
          color = '#66CC66'
          break
        case 'plane':
          color = '#663300'
          break
      }

      return color
    },

    addDiscarded: function (track, trackNumber) {
      var discardedCircles = track.discardedPoints.map(p => {
        var m = new Leaflet.CircleMarker([p.gpx.latitude, p.gpx.longitude], {
          color: '#ff8300',
          radius: 1.5
        })
        m.on('click', e => {
          this.showDiscardedPopup(track, p)
          e.originalEvent._gpxHandled = true
          e.originalEvent.stopImmediatePropagation()
        })
        return m
      })

      if (discardedCircles.length > 0) {
        // Add to the overlay control but NOT the map - that way, it'll be unchecked and not visible initially
        var discardedGroupLayer = new Leaflet.FeatureGroup(discardedCircles)
        discardedGroupLayer.track = track
        this.addToMapLayersControl(discardedGroupLayer, '#' + trackNumber + ' discarded')
      }
    },

    addStops: function (track, trackNumber) {
      var stopCircles = track.stops.map(s => {
        var options = {
          color: 'red',
          radius: 20,
          fillOpacity: 0.5
        }
        if (s.style === 'paused') {
          options = { 
            color: 'yellow',
            fillColor: '#3399FF',
            weight: 3,
            fillOpacity: 0.8,
            radius: 10 
          }
        }
        var m = new Leaflet.Circle([s.latitude, s.longitude], options)
        m.on('click', e => {
          this.showStopPopup(track, s)
          e.originalEvent._gpxHandled = true
          e.originalEvent.stopImmediatePropagation()
        })
        return m
      })

      if (stopCircles.length > 0) {
        var stopGroupLayer = new Leaflet.FeatureGroup(stopCircles)
        stopGroupLayer.track = track
        stopGroupLayer.addTo(this.map)
        this.addToMapLayersControl(stopGroupLayer, '#' + trackNumber + ' stops')
      }
    },

    clearHighlightRunLine: function () {
      if (this.highlightedRunLine !== null) {
        let color = this.runColor(this.highlightedRunLine.run)
        this.highlightedRunLine.setStyle({color: color, weight: 3})
        this.highlightedRunLine = null
      }
    },

    highlightRunLine: function (runLine) {
      // No more than one line will be highlighted - if a second line is clicked,
      // remove highlighting of the first and highlight the second.
      this.clearHighlightRunLine()

      runLine.setStyle({color: '#AB8AFD', weight: 5})
      this.highlightedRunLine = runLine
    },

    addToMapLayersControl: function (layer, name) {
      if (this.mapLayersControl == null) {
        var overlayLayer = {}
        overlayLayer[name] = layer
        this.mapLayersControl = Leaflet.control.layers(
          null, overlayLayer, { position: 'topright', collapsed: false }).addTo(this.map)
      } else {
        this.mapLayersControl.addOverlay(layer, name)
      }
    },

    clearMap: function () {
      this.map.eachLayer( l => {
        if (l.track !== undefined) {
          this.map.removeLayer(l)
        }
      })

      if (this.mapLayersControl) {
        this.map.removeControl(this.mapLayersControl)
        this.mapLayersControl = null
      }
    },

    runLinePopup: function (track, run, latlng) {
      var nearest = this.findNearestPoint(run, latlng.lat, latlng.lng)
      if (nearest) {
        this.showRunPopup(run, nearest)
      }
    },

    showRunPopup: function (run, point) {
      let timestamp = new Date(point.gpx.time)
      let content = sprintf.sprintf(
        '%s, %s <br>' +   // timestamp
        '%f,%f <br>' +    // lat,lon
        'Transportation: <br> <div class="gpx-info-tab">run: <b>%s</b> (%d%%)</div> <div class="gpx-info-tab">point: <b>%s</b> (%d%%)</div>' +
        'From start: %f miles (%f km), %s <br>' +
        'Speed: %f mph, smoothed: %f mph <br>HDOP: %f; PDOP: %f <br>This run is %f miles (%f km), %s',
        timestamp.toDateString(),
        timestamp.toLocaleTimeString(),
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
        Geo.displayableDuration((run.seconds) * 1000))
      this.showPopup(content, point.gpx.latitude, point.gpx.longitude, point)
    },

    showDiscardedPopup: function (track, point) {
      let timestamp = new Date(point.gpx.time)
      let content = sprintf.sprintf(
        '%s, %s <br>' +   // timestamp
        '%f,%f <br>' +    // lat,lon
        '<b>Discarded: %s</b> <br>Fix: %s <br>HDOP: %f <br>PDOP: %f',
        timestamp.toDateString(),
        timestamp.toLocaleTimeString(),
        point.gpx.latitude,
        point.gpx.longitude,
        point.reason,
        point.gpx.fix,
        point.gpx.hdop,
        point.gpx.pdop)
      this.showPopup(content, point.gpx.latitude, point.gpx.longitude, null)
    },

    showStopPopup: function (track, point) {
      let type = point.style === 'stopped' ? 'Stopped' : 'Paused'
      let startTimestamp = new Date(point.startTime)
      let endTimestamp = new Date(point.endTime)
      let content = sprintf.sprintf(
        '%s, %s <br>' +   // timestamp
        '%f,%f <br>' +    // lat,lon
        '<b>%s</b> for %s <br>Start: %s, %s <br>End: %s, %s',
        startTimestamp.toDateString(),
        startTimestamp.toLocaleTimeString(),
        point.latitude,
        point.longitude,
        type,
        Geo.displayableDuration(point.durationSeconds * 1000),
        startTimestamp.toDateString(),
        startTimestamp.toLocaleTimeString(),
        endTimestamp.toDateString(),
        endTimestamp.toLocaleTimeString())
      this.showPopup(content, point.latitude, point.longitude, null)
    },

    showPopup: function(content, latitude, longitude, selectedPoint) {
      this.gpxInfoControl.showInfo(content)
      this.showMarker(latitude, longitude)

      if (selectedPoint) {
        this.currentlySelectedPoint = selectedPoint
        this.$store.commit('selectPoint', selectedPoint)
      } else {
        this.currentlySelectedPoint = null
      }
    },

    showMarker: function(latitude, longitude) {
      if (!this.mapMarker) {
        this.mapMarker = Leaflet.marker([latitude, longitude]).addTo(this.map)
      } else {
        this.mapMarker.setLatLng([latitude, longitude]).addTo(this.map)
      }
    },

    hideMarker: function () {
      this.mapMarker.removeFrom(this.map)
    },

    hideGpxInfo: function () {
      this.gpxInfoControl.hideInfo()
    },

    findNearestPoint: function (run, lat, lon) {
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
    },

    findTrackAndRun: function (point) {
      var response = null
      this.stats.tracks.forEach(t => {
        t.runs.forEach(r => {
          if (point.gpx.time >= r.points[0].gpx.time && point.gpx.time <= r.points[r.points.length - 1].gpx.time) {
            response = { track: t, run: r }
          }
        })
      })

      return response
    }
  },

  mounted: function () {

    var newMap = Leaflet.map('map', {
      center: [47.62060841124417, -122.3492968082428],
      zoom: 10,
      minZoom: 3,
      zoomControl: false
    })

    Leaflet.control.zoom({ position: 'topright' }).addTo(newMap)

    this.gpxInfoControl = Leaflet.control.gpxInfoControl({ position: 'bottomleft' })
    this.gpxInfoControl.addTo(newMap)

    Leaflet.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
    }).addTo(newMap)

    Leaflet.control.scale({ position: 'bottomright' }).addTo(newMap)
    this.map = newMap

    this.map.on('click', e => {
      if (e.originalEvent._gpxHandled === true) {
        return
      }

      this.hideMarker()
      this.hideGpxInfo()
      this.clearHighlightRunLine()
    })
  }
}

</script>

<style>
.gpx-info-control {
  color: black;
  display: block;
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  box-shadow: 0 0 1px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.8);
}
.gpx-info-tab {
  margin-left: 10px;
}
</style>

<style scoped>
.trackMap {
    border: 1px #888 solid;
    border-left: none;
    border-right: none;
    margin: 0;
    flex: 1 1 auto;
}
</style>
