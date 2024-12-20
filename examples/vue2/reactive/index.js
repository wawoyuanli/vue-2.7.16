const app = new Vue({
  el: '#demo',
  data: {
    sock: '袜子',
    shoes: '帆布鞋',
    stillLove: true,
    feelHurt: true,
    life: {
      light: 'can not bear',
      chinese: '不能承受的生命之轻',
      author: ''
    }
  },
  computed: {
    missing: {
      get: function () {
        return this.sock || this.feelHurt
      },
      cache: false
    },
    dressup() {
      return this.sock + ',' + this.shoes
    }
  },
  methods: {
    change() {
      this.sock = '蓝色图案的袜子'
      // this.sock = this.sock.revert()
    },
    changeAuthor() {
      this.life.author = '米兰昆德拉'
    }
  },
  watch: {
    life: [
      {
        handler: function (newVal, oldVal) {
          console.log(newVal, 'life[0]')
        },
        deep: true,
        sync: true
        // immediate: true
      },
      {
        handler: function (newVal, oldVal) {
          console.log(newVal, 'life[1]')
        }
      },
      function (newVal, oldVal) {
        console.log(newVal)
      }
    ]
  }
})
var name = 'jjjj'
app.$watch('name', (newVal, oldVal) => {
  console.log(newVal, oldVal)
})
