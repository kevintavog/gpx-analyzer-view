<template>
  <div id="app">
    <TrackPanel />
    <Map />
    <TrackChart />
  </div>
</template>

<script>
import Map from './components/Map.vue'
import TrackChart from './components/TrackChart.vue'
import TrackPanel from './components/TrackPanel.vue'

export default {
  name: 'app',
  components: {
    Map, TrackChart, TrackPanel
  }
}
</script>

<style>

.leaflet-fake-icon-image-2x {
  background-image: url(../node_modules/leaflet/dist/images/marker-icon-2x.png);
}
.leaflet-fake-icon-shadow {
  background-image: url(../node_modules/leaflet/dist/images/marker-shadow.png);
}
@import "../node_modules/leaflet/dist/leaflet.css";

#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: white;
  width: 100%; 
  height: 100%; 
  margin: 0; 
  display: flex;
  flex-flow: column;
}

</style>
