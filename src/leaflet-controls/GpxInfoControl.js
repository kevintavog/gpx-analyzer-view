import Leaflet from 'leaflet'


Leaflet.Control.GpxInfoControl = Leaflet.Control.extend({

    onAdd: function (map) {     // eslint-disable-line no-unused-vars
        this._gpxContainer = Leaflet.DomUtil.create('div', 'gpx-info-control')
        this._gpxContainer.innerHTML = null
        this._gpxContainer.style.display = 'none'
        Leaflet.DomEvent.disableClickPropagation(this._gpxContainer)
        return this._gpxContainer
    },

    onRemove: function(map) {   // eslint-disable-line no-unused-vars
console.log('onRemove called')
        // Nothing to do here
    },

    hideInfo: function () {
        this._gpxContainer.style.display = 'none'
    },

    showInfo: function (html) {
        if (!this._gpxContainer) {
            console.log('no container on call to showInfo ')
        }
        this._gpxContainer.style.display = ''
        this._gpxContainer.innerHTML = html
    }
})

Leaflet.control.gpxInfoControl = function(opts) {
    return new Leaflet.Control.GpxInfoControl(opts)
}
