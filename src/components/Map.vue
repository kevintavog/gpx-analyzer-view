<template>
    <div class='trackMap' id='map'>
    </div>
</template>


<script>
import { mapState } from 'vuex'
import Gpx from '../utilities/gpx'
import Leaflet from 'leaflet'
import MapPopupFormatter from '../utilities/mapPopupFormatter'
import '../leaflet-controls/GpxInfoControl'
import '../leaflet-controls/GpxTrackControl'

export default {
  name: 'Map',

  data () {
    return {
      map: null,
      mapLayersControl: null,
      mapMarker: null,
      gpxInfoControl: null,
      gpxTrackControl: null,
      currentTrack: -1,
      currentRun: -1,
      trackLayers: [],
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
        let trackAndRun = Gpx.findTrackAndRun(this.stats.tracks, this.currentlySelectedPoint)
        if (trackAndRun) {
          let p = this.currentlySelectedPoint
          this.showPopup(MapPopupFormatter.runPoint(trackAndRun.run, p), p.gpx.latitude, p.gpx.longitude, p)
        }
      }
    }
  },

  methods: {
    statsAdded: function () {
      this.clearMap()

      this.addOriginal(this.stats.tracks[0].runs[0], this.stats.original)

      // There are 0 to many tracks, each with
      //    0 to many runs
      //    0 to many discarded points
      //    0 to many stops
      // Map all runs as one layer & the discarded points & stops as seperate layers
      var trackNumber = 1
      this.trackLayers = []
      var transportationMap = {}
      var stoppedDuration = 0
      var discardedCount = 0

      this.stats.tracks.forEach(t => {
        let runs = this.addRuns(t, trackNumber)
        let stops = this.addStops(t, trackNumber)
        this.addDiscarded(t, trackNumber)
        trackNumber += 1
        this.trackLayers.push({ runs: runs, stops: stops })

        t.runs.forEach(r => {
          if (r.style === 'track') {
            let type = r.speedTypes[0].transportation
            if (type in transportationMap) {
              var existing = transportationMap[type]
              existing.kilometers += r.kilometers
              existing.seconds += r.seconds
            } else {
              transportationMap[type] = { kilometers: r.kilometers, seconds: r.seconds }
            }
          }
        })
        t.stops.forEach(s => {
          stoppedDuration += s.durationSeconds
        })
        discardedCount += t.discardedPoints.length
      })
      this.currentTrack = 0
      this.currentRun = 0
      this.showRunInfo()

      let content = MapPopupFormatter.overview(transportationMap, stoppedDuration, discardedCount, this.stats.tracks)
      this.gpxTrackControl.showTrackInfo(content)

    },

    addOriginal: function (run, original) {
      var circles = original.map(p => {
        var m = new Leaflet.CircleMarker([p.latitude, p.longitude], {
          color: '#ffff00',
          radius: 1
        })
        m.on('click', e => {
          this.showPopup(MapPopupFormatter.original(run.timezoneInfo, p), p.latitude, p.longitude, null)
          e.originalEvent._gpxHandled = true
          e.originalEvent.stopImmediatePropagation()
        })
        return m
      })

      if (circles.length > 0) {
        // Add to the overlay control but NOT the map - that way, it'll be unchecked and not visible initially
        var groupLayer = new Leaflet.FeatureGroup(circles)
        // groupLayer.addTo(this.map)
        this.addToMapLayersControl(groupLayer, 'original')
      }
    },

    addRuns: function (track, trackNumber) {
      var trackRuns = []
      var runIndex = 0
      track.runs.forEach(r => {
        var runLatLngList = r.points.map(p => {
            var ll = new Leaflet.LatLng(p.gpx.latitude, p.gpx.longitude)
            ll.meta = { point: p }
            return ll
        })

        var color = this.runColor(r)
        var weight = 3
        var dashArray = ''
        var opacity = 1.0
        if (r.style === 'virtual') {
          opacity = 0.7
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

        let capturedRunIndex = runIndex
        var runLine = new Leaflet.Polyline(
          runLatLngList,
          { color: color, weight: weight, clickable: true, dashArray: dashArray, opacity: opacity })
        runLine.run = r
        runLine.on('click', e => {
          this.runLinePopup(track, r, e.latlng)
          this.highlightRunLine(runLine)
          this.currentTrack = trackNumber - 1
          this.currentRun = capturedRunIndex
          this.showRunInfo()
          e.originalEvent._gpxHandled = true
          e.originalEvent.stopImmediatePropagation()
        })

        this.addRunVectors(r, trackNumber, runIndex)

        runIndex += 1
        trackRuns.push(runLine)
      })

      var runLayer = new Leaflet.FeatureGroup(trackRuns)
      runLayer.track = track
      runLayer.addTo(this.map)
      this.addToMapLayersControl(runLayer, '#' + trackNumber + ' runs')
      return trackRuns
    },

    addRunVectors: function (run, trackNumber, runNumber) {
      var vectors = []
      var vectorNumber = 0
      run.vectors.forEach(v => {
        var latLngList = v.points.map(p => {
            return new Leaflet.LatLng(p.gpx.latitude, p.gpx.longitude)
        })

        let capturedVectorNumber = vectorNumber
        let color = ((vectorNumber % 2) == 0) ? 'orange' : 'red'
        var vectorLine = new Leaflet.Polyline(
          latLngList,
          { color: color, weight: 4, clickable: true })
        vectorLine.on('click', e => {
          this.showPopup(MapPopupFormatter.vector(v, capturedVectorNumber + 1, run.timezoneInfo), null, null, null)
          e.originalEvent._gpxHandled = true
          e.originalEvent.stopImmediatePropagation()
        })
        vectors.push(vectorLine)

        vectorNumber += 1
      })

      if (vectors.length > 0) {
        var vectorLayer = new Leaflet.FeatureGroup(vectors)
        vectorLayer.addTo(this.map)
        this.addToMapLayersControl(vectorLayer, '#' + trackNumber + ', #' + runNumber + ' vectors')
      }
    },

    addDiscarded: function (track, trackNumber) {
      var discardedCircles = track.discardedPoints.map(p => {
        var m = new Leaflet.CircleMarker([p.gpx.latitude, p.gpx.longitude], {
          color: '#ff8300',
          radius: 1.5
        })
        m.on('click', e => {
          this.clearHighlightRunLine()
          this.showPopup(MapPopupFormatter.discarded(track, p), p.gpx.latitude, p.gpx.longitude, null)
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
      var stopRectangles = []
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

        if (s.minLat) {
          stopRectangles.push(new Leaflet.Rectangle([[s.minLat, s.minLon], [s.maxLat, s.maxLon]], {
            color: '#FF0000',
            weight: 1
          }))
        }

        var m = new Leaflet.Circle([s.latitude, s.longitude], options)
        m.on('click', e => {
          this.clearHighlightRunLine()
          this.showPopup(MapPopupFormatter.stop(track, s), s.latitude, s.longitude, null)
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

        if (stopRectangles.length > 0) {
          var stopRectangleLayer = new Leaflet.FeatureGroup(stopRectangles)
          stopRectangleLayer.addTo(this.map)
          this.addToMapLayersControl(stopRectangleLayer, '#' + trackNumber + ' rectangles')
        }
      }

      return stopCircles
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
      var nearest = Gpx.findNearestPoint(run, latlng.lat, latlng.lng)
      if (nearest) {
        this.showPopup(MapPopupFormatter.runPoint(run, nearest), nearest.gpx.latitude, nearest.gpx.longitude, nearest)
      }
    },

    showRunInfo: function () {
      let track = this.stats.tracks[this.currentTrack]
      let run = track.runs[this.currentRun]
      let content = MapPopupFormatter.runInfo(this.currentTrack + 1, this.currentRun + 1, run)
      this.gpxTrackControl.showRunInfo(content)
    },

    showPopup: function(content, latitude, longitude, selectedPoint) {
      this.gpxInfoControl.showInfo(content)
      if (latitude && longitude) {
        this.showMarker(latitude, longitude)
      }

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
      if (this.mapMarker) {
        this.mapMarker.removeFrom(this.map)
      }
    },

    hideGpxInfo: function () {
      this.gpxInfoControl.hideInfo()
    },

    trackInfoSelect: function () {
      if (this.stats.tracks) {
        let info = this.getCurrentTrackInfo()
        if (info && info.runLayer) {
          if (info.runLayer === this.highlightedRunLine) {
            this.clearHighlightRunLine()
          } else {
            this.highlightRunLine(info.runLayer)
            this.fitCurrentRunBounds()
          }
        }
      }
    },

    trackInfoNext: function () {
      if (this.stats.tracks) {
        this.currentRun += 1
        if (this.currentRun >= this.stats.tracks[this.currentTrack].runs.length) {
          this.currentRun = 0
          this.currentTrack += 1
          if (this.currentTrack >= this.stats.tracks.length) {
            this.currentTrack = 0
          }
        }

        this.trackInfoSelect()
        this.showRunInfo()
        this.fitCurrentRunBounds()
      }
    },

    trackInfoPrevious: function () {
      if (this.stats.tracks) {
        this.currentRun -= 1
        if (this.currentRun < 0) {
          this.currentTrack -= 1
          if (this.currentTrack < 0) {
            this.currentTrack = this.stats.tracks.length - 1
          }
          this.currentRun = this.stats.tracks[this.currentTrack].runs.length - 1
        }
        this.trackInfoSelect()
        this.showRunInfo()
        this.fitCurrentRunBounds()
      }
    },

    fitCurrentRunBounds: function () {
      let run = this.stats.tracks[this.currentTrack].runs[this.currentRun]
      this.map.fitBounds([
        [run.minLat, run.minLon],
        [run.maxLat, run.maxLon]
      ])
    },

    getCurrentTrackInfo: function () {
      if (!this.stats.tracks || this.currentTrack >= this.stats.tracks.length) {
        return null
      }
      let track = this.stats.tracks[this.currentTrack]
      if (this.currentRun >= track.runs.length) {
        return null
      }

      return { run: track.runs[this.currentRun], runLayer: this.trackLayers[this.currentTrack].runs[this.currentRun]}
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

    this.gpxTrackControl = Leaflet.control.gpxTrackControl({ position: 'bottomleft' }).addTo(newMap)
    this.gpxInfoControl = Leaflet.control.gpxInfoControl({ position: 'bottomleft' }).addTo(newMap)

    Leaflet.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
    }).addTo(newMap)

    Leaflet.control.scale({ position: 'bottomright' }).addTo(newMap)
    this.map = newMap


    this.map.on('track-info-previous', e => {     // eslint-disable-line no-unused-vars
      this.trackInfoPrevious()
    })

    this.map.on('track-info-next', e => {        // eslint-disable-line no-unused-vars
      this.trackInfoNext()
    })

    this.map.on('track-info-select', e => {       // eslint-disable-line no-unused-vars
      this.trackInfoSelect()
    })

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
.gpx-track-control {
  color: black;
  display: block;
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  box-shadow: 0 0 1px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.8);
}
.gpx-track-control-button-container {
  text-align: center;
}
.gpx-track-control-button {
    display:inline-block;
    margin-left:20px;
    margin-right:20px;
}
.gpx-track-control-info {
}
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
