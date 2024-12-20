/* 引入初始化函数 */
import { initMixin } from './init'
/* 初始化state props data watch computed等 */
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'

import { warn } from '../util/index'
import type { GlobalAPI } from 'types/global-api'

function Vue(options) {
  if (__DEV__ && !(this instanceof Vue)) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  /* Vue.prototype._init 绑定在Vue原型对象上，全局可访问  【初始化入口】*/
  this._init(options)
}


/* 以下方法将Vue作为入参给Vue原型对象添加全局访问的属性和方法 */
//@ts-expect-error Vue has function type
initMixin(Vue) //初始化Vue  注册Vue.prototype._init
//@ts-expect-error Vue has function type
stateMixin(Vue) //数据绑定，$watch观察者监听   Vue.prototype.$set（$delete,$watch）
//@ts-expect-error Vue has function type
eventsMixin(Vue) //初始化事件绑定  Vue.prototype.$on($emit,$once,$off)
//@ts-expect-error Vue has function type
lifecycleMixin(Vue)  //初始化vue更新，销毁等生命周期  Vue.prototype._update 
//@ts-expect-error Vue has function type
renderMixin(Vue) //初始化render函数 Vue.prototype._render Vue.prototype.$nextTick

export default Vue as unknown as GlobalAPI

/*

1:第一步 先初始化Vue (走完当前文件中所有代码)
2:执行initGlobalAPI

*/
//入口寻找
// 1:  入口【platforms/web/entry-runtime-with-compiler】中导入了【/runtime/index】导出的vue。
// 2: 【/runtime/index】中引入了【core/index】中的 vue。
// 3: 【core/index】中引入了【instance/index】中的 vue。
// 4: 【instance/index】中，定义了vue的构造函数