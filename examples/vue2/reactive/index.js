const app = new Vue({
  el: '#demo',
  data: {
    sock: '袜子',
    message: '2',
    aa: {
      bb: 'bb'
    }
  },
  methods: {
    onClick() {
      this.aa = { bb: '袜子' + Math.random(), cc: 'cc' }
    }
  }
})
