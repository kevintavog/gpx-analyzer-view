import Leaflet from 'leaflet'


Leaflet.Control.GpxTrackControl = Leaflet.Control.extend({

    onAdd: function (map) {     // eslint-disable-line no-unused-vars
        this._gpxContainer = Leaflet.DomUtil.create('div', 'gpx-track-control')
        // this._gpxContainer.style.display = 'none'
        Leaflet.DomEvent.disableClickPropagation(this._gpxContainer)

        this._gpxSwitchToTrack = this._createButton(
            '<i class="fas fa-globe fa-2x"></i>', 'switch to track', 'gpx-track-control-info', this._gpxContainer, this._switchToTrack)
        this._gpxSwitchToRun = this._createButton(
            '<i class="fas fa-road fa-2x"></i>', 'switch to run', 'gpx-track-control-info', this._gpxContainer, this._switchToRun)

        this._gpxButtonDiv = Leaflet.DomUtil.create('div', 'gpx-track-control-button-container', this._gpxContainer)
        this._gpxPreviousButton = this._createButton(
            '<i class="fas fa-arrow-left fa-2x"></i>', 'previous', 'gpx-track-control-button gpx-track-previous', this._gpxButtonDiv, this._previousClick)
        this._gpxSelectRun = this._createButton(
            '<i class="fas fa-dot-circle fa-2x"></i>', 'select', 'gpx-track-control-button gpx-track-select', this._gpxButtonDiv, this._selectClick)
        this._gpxNextButton = this._createButton(
            '<i class="fas fa-arrow-right fa-2x"></i>', 'next', 'gpx-track-control-button gpx-track-next', this._gpxButtonDiv, this._nextClick)
        this._gpxTrackInfo = Leaflet.DomUtil.create('div', 'gpx-track-control-info', this._gpxContainer)

        this._gpxSwitchToTrack.style.display = 'none'
        this._gpxTrackInfo.innerHTML = ''
        this._gpxButtonDiv.style.display = 'none'

        this._gpxRunInfoHtml = ''
        this._gpxTrackInfoHtml = ''

        return this._gpxContainer
    },

    showRunInfo: function (html) {
        this._gpxContainer.style.display = ''
        this._gpxRunInfoHtml = html
        if (this._isRunActive()) {
            this._gpxTrackInfo.innerHTML = html
        }
    },

    showTrackInfo: function (html) {
        this._gpxContainer.style.display = ''
        this._gpxTrackInfoHtml = html
        if (!this._isRunActive()) {
            this._gpxTrackInfo.innerHTML = html
        }
    },

    _isRunActive: function () {
        return this._gpxButtonDiv.style.display === ''
    },

    _switchToRun: function (e) {        // eslint-disable-line no-unused-vars
        this._gpxButtonDiv.style.display = ''
        this._gpxSwitchToRun.style.display = 'none'
        this._gpxSwitchToTrack.style.display = ''
        this._gpxTrackInfo.innerHTML = this._gpxRunInfoHtml

        this._map.fire('track-info-type-run', {trackinfo: this})
    },

    _switchToTrack: function (e) {        // eslint-disable-line no-unused-vars
        this._gpxButtonDiv.style.display = 'none'
        this._gpxSwitchToRun.style.display = ''
        this._gpxSwitchToTrack.style.display = 'none'
        this._gpxTrackInfo.innerHTML = this._gpxTrackInfoHtml

        this._map.fire('track-info-type-track', {trackinfo: this})
    },

    _previousClick: function (e) {          // eslint-disable-line no-unused-vars
        this._map.fire('track-info-previous', {trackinfo: this })
    },

    _selectClick: function (e) {            // eslint-disable-line no-unused-vars
        this._map.fire('track-info-select', {trackinfo: this })
    },

    _nextClick: function (e) {              // eslint-disable-line no-unused-vars
        this._map.fire('track-info-next', {trackinfo: this })
    },

    _createButton: function (html, title, className, container, fn) {
		var link = Leaflet.DomUtil.create('a', className, container)
        link.href = '#'
        link.innerHTML = html
		link.title = title

		Leaflet.DomEvent.disableClickPropagation(link)
		Leaflet.DomEvent.on(link, 'click', Leaflet.DomEvent.stop)
		Leaflet.DomEvent.on(link, 'click', fn, this)
		Leaflet.DomEvent.on(link, 'click', this._refocusOnMap, this)

		return link
	}    
})

Leaflet.control.gpxTrackControl = function(opts) {
    return new Leaflet.Control.GpxTrackControl(opts)
}
