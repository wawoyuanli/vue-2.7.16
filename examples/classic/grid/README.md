```
1 模版的三种编写方式

// 1. 熟悉的字符串模板
const vm = new Vue({
el:'#app',
template: '<div>模板字符串</div>'
})
// 2. 选择符匹配元素的 innerHTML 模板

<div id="app">
  <div>test1</div>
   <script type="x-template" id="test">
     <p>test</p>
   </script>
</div>
const vm = new Vue({
  el: '#app',
  template: '#test'
})
// 3. dom元素匹配的innerHTML模板
<div id="app">
 <div>test1</div>
 <span id="test"><div class="test2">test2</div></span>
</div>
var vm = new Vue({
 el: '#app',
 template: document.querySelector('#test')
})
```
