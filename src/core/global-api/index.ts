import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'
import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'
import type { GlobalAPI } from 'types/global-api'

export function initGlobalAPI(Vue: GlobalAPI) {
  // config
  const configDef: Record<string, any> = {}
  configDef.get = () => config
  if (__DEV__) {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  Vue.util = {
    warn, //警告打印相关
    extend, //浅拷贝函数
    mergeOptions, //配置合并
    defineReactive //定义响应式属性
  }

  /* 静态方法 */
  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  // 2.6 explicit observable API
  Vue.observable = <T>(obj: T): T => {
    observe(obj)
    return obj
  }

  Vue.options = Object.create(null)
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  //跟Weex's 多场景相关
  Vue.options._base = Vue
  extend(Vue.options.components, builtInComponents)

  //定义Vue.use()主要应用在插件系统中  
  initUse(Vue)
  //定义Vue.mixin() this.options = mergeOptions(this.options, mixin)
  initMixin(Vue)
  //定义Vue.extend, 用作原型继承，通过它，可以创建子组件的构造函数
  initExtend(Vue)
  //扩展'Vue.component', 'Vue.directive', 'Vue.filter'方法
  initAssetRegisters(Vue)
}
