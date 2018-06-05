<template>
    <div class="trackPanel">
        <div id="fileInput">
            <input class="c-button--small" type="file" id="files" name="files[]" multiple="true" v-on:change="addLocalFiles($event)" />
        </div>
    </div>
</template>

<script>

export default {
  name: 'TrackPanel',

  data () {
    return {
    }
  },

  methods: {
    addLocalFiles: function (event) {
      this.$store.commit('addFiles', event.target.files[0])
    }

  }
}
</script>

<style scoped>
.trackPanel {
  flex: 0 1 auto;
}

.even {
    color:lightgreen;
}

.odd {
    color:white;
}

.smallAlert {
  margin-bottom: 5px;
  padding: 0.3em;
}
</style>
