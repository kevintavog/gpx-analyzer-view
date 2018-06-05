<template>
    <div class="trackChart">
        <canvas id="chart" width="400" height="200" ref="canvas" />
    </div>
</template>

<script>

import { mapState } from 'vuex'
import Chart from 'chart.js'
import BinarySearch from '../utilities/binarySearch'
import Geo from '../utilities/geo'

export default {
  name: 'TrackChart',

  data() {
    return {
      currentlySelectedPoint: null,
      allPoints: [],

      // Chart.js
      canvas: null,
      chart: null,
      chartData: { },
      options: {
          animation: {
              duration: 0
          },
          responsive:true,
          responsiveAnimationDuration: 0,
          maintainAspectRatio:false,
          onClick: (evt) => {
            let data = this.chart.getElementsAtXAxis(evt)
            if (data.length > 0) {
              let clickedIndex = data[0]._index
              this.chartClicked(clickedIndex)
            }
          },
          legend: {
              labels: {
                  usePointStyle: true,
              },
          },
          scales: {
              xAxes: [{
                barThickness: 0.5,
                stacked: true
              }],
              yAxes: [{
                stacked: true,
                type: "linear",
                display: true,
                position: "left",
                id: "y-axis-speed",
                ticks: {
                    min: 0,
                    max: 20
                }
              }, {
                stacked: true,
                type: "linear",
                display: true,
                position: "right",
                id: "y-axis-probability",
                ticks: {
                    min: 0,
                    max: 100
                }
              }],
          },
          tooltips: {
            mode: 'index',
            intersect: false
            // callbacks: {
            //   footer: function(tooltipItems, data) {
// console.log('tooltip footer: %o, %o', tooltipItems, data)
            //   }
            // }
          }
      }
    }
  },

  mounted: function() {
      this.canvas = this.$refs['canvas']
      Chart.defaults.global.defaultFontColor = 'rgba(255, 255, 255, 255)'
      Chart.defaults.global.animation.duration = 0
      this.renderChart()
  },

  computed: mapState([
    'selectedPoint',
    'stats'
  ]),

  watch: {
    stats () {
      this.buildChartData()
      this.renderChart()
    },

    selectedPoint () {
// console.log('ignoring selected point change')
      // if (this.currentlySelectedPoint != this.selectedPoint) {
      //   this.currentlySelectedPoint = this.selectedPoint
      //   this.highlightPoint(this.selectedPoint)
      // }
    }
  },

  methods: {
    chartClicked: function(index) {
      if (index >= 0 && index < this.allPoints.length) {
        let point = this.allPoints[index]
        this.currentlySelectedPoint = point
        this.$store.commit('selectPoint', point)
      }
    },

    renderChart: function() {
      if (this.chart == null) {
        this.chart = new Chart(
          this.canvas, {
            type: 'bar',
            // type: 'line',
            data: this.chartData,
            options: this.options,
        })
      } else {
        this.chart.update(0)
      }
    },

    highlightPoint: function(pt) {
      let index = BinarySearch.search(this.allPoints, pt, (a, b) => {
        return new Date(a.gpx.time) - new Date(b.gpx.time)
      })

      if (index >= 0 && index < this.allPoints.length) {
        console.log('highlight: %o: %o', index, this.allPoints[index])
      }
    },

    getTransporationValues: function(type) {
      return this.allPoints.map(p => {
        if (p) {
          let st = p.speedTypes.filter( s => s.transportation === type )
          if (st.length > 0) {
            return st[0].probability * 100
          }
        }
        return 0.0
      })
    },

    buildChartData: function() {
      if (this.stats === null) {
        return
      }

//      this.chart.options.scales.yAxes[0].ticks.max =  Math.ceil(Geo.kilometersToMiles(this.maxSpeedKmH))

      // There will be one data point per second. Multiple tracks are done one after the other.
      this.allPoints = []
      this.stats.tracks.forEach(t => {
        t.runs.forEach(r => {
          this.allPoints = this.allPoints.concat(r.points)
        })
      })

      this.chartData.labels = this.allPoints.map(String.prototype.valueOf, '')
      this.chartData.datasets = []
      // this.chartData.datasets.push({
      //   backgroundColor: 'rgba(0, 0, 0, 0)',
      //   borderColor: 'rgba(255, 2, 2, 0.9)',
      //   borderWidth: 1,
      //   data: this.allPoints.map(p => p ? Geo.metersPerSecondToMilesPerHour(p.gpx.speed).toFixed(2) : NaN),
      //   fill: false,
      //   label: 'GPX speed',
      //   pointRadius: 0,
      //   type: 'line',
      //   yAxisID: "y-axis-speed"
      // })

      // this.chartData.datasets.push({
      //   backgroundColor: 'rgba(0, 0, 0, 0)',
      //   borderColor: 'rgba(10, 255, 255, 0.9)',
      //   borderWidth: 1,
      //   data: this.allPoints.map(p => p ? Geo.metersPerSecondToMilesPerHour(p.smoothedGpxSpeed).toFixed(2) : NaN),
      //   fill: false,
      //   label: 'Smoothed speed',
      //   pointRadius: 0,
      //   type: 'line'
      // })

      this.chartData.datasets.push({
        backgroundColor: 'rgba(255, 255, 2, 0.8)',
        borderColor: 'rgba(255, 255, 2, 0.8)',
        data: this.getTransporationValues('foot'),
        label: 'foot',
        stack: 'transportation',
        type: 'bar',
        yAxisID: "y-axis-probability"
      })

      this.chartData.datasets.push({
        backgroundColor: 'rgba(2, 255, 2, 0.8)',
        borderColor: 'rgba(2, 255, 2, 0.8)',
        data: this.getTransporationValues('bicycle'),
        label: 'bicycle',
        stack: 'transportation',
        type: 'bar',
        yAxisID: "y-axis-probability"
      })

    }
  }
}
</script>

<style scoped>

.trackPanel {
  flex: 0 1 auto;
}

</style>
