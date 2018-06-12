import Vue from 'vue'
import App from './App.vue'
import store from './stores'
import Leaflet from 'leaflet'
import '../node_modules/leaflet/dist/leaflet.css'

Vue.config.productionTip = false

// From https://github.com/KoRiGaN/Vue2Leaflet/issues/96
// Hack so that leaflet markers work
import marker from 'leaflet/dist/images/marker-icon.png'
import marker2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete Leaflet.Icon.Default.prototype._getIconUrl

Leaflet.Icon.Default.mergeOptions({
    iconRetinaUrl: marker2x,
    iconUrl: marker,
    shadowUrl: markerShadow
})

new Vue({
  render: h => h(App),
  store: store,
}).$mount('#app')
