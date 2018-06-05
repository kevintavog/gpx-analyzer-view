import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    selectedPoint: null,
    stats: []
  },

  mutations: {
    selectPoint (state, point) {
      state.selectedPoint = point
    },

    addFiles (state, file) {
      var reader = new FileReader()
      reader.onloadend = (function () {
        return function (e) {
          state.stats = JSON.parse(e.target.result)
        }
      })()

      reader.readAsText(file)
    }
  }

})
