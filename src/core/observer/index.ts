import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  isArray,
  hasProto,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering,
  hasChanged,
  noop
} from '../util/index'
import { isReadonly, isRef, TrackOpTypes, TriggerOpTypes } from '../../v3'

//arrayMethods为7种数组方法
//arrayKeys = 'push',
  // 'pop',
  // 'shift',
  // 'unshift',
  // 'splice',
  // 'sort',
  // 'reverse'
const arrayKeys = Object.getOwnPropertyNames(arrayMethods)
const NO_INITIAL_VALUE = {}

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving(value: boolean) {
  shouldObserve = value
}

// ssr mock dep
const mockDep = {
  notify: noop,
  depend: noop,
  addSub: noop,
  removeSub: noop
} as Dep

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
/**
 * 1:Observer 类被附加到每个被观察的对象上。
 * 2:一旦附加，Observer 将目标对象的属性键转换为 getter 和 setter
 * 3:用于收集依赖和分发更新
 */
export class Observer {
  dep: Dep //依赖管理对象
  vmCount: number //使用该对象作为根 $data 的 vm 数量 // number of vms that have this object as root $data

  constructor(public value: any, public shallow = false, public mock = false) {
    // this.value = value
    //初始化Observer实例
    //创建依赖管理对象 Dep
    this.dep = mock ? mockDep : new Dep() //发布者
    this.vmCount = 0 //记录有多少个 vm 实例使用该对象作为根 $data
    // 在值 value 上定义 __ob__ 属性，指向当前 Observer 实例
    def(value, '__ob__', this)
    if (isArray(value)) {
      if (!mock) {
        if (hasProto) {
          /* eslint-disable no-proto */
          //果支持原型链修改，则将数组的原型指向 arrayMethods
          ;(value as any).__proto__ = arrayMethods
          /* eslint-enable no-proto */
        } else {
          //否则，逐个定义数组的方法
          for (let i = 0, l = arrayKeys.length; i < l; i++) {
            const key = arrayKeys[i]
            // arrayMethods = 【'push','pop','shift','unshift','splice','sort','reverse'】
            //将数组数据变成响应式数据核心方法
            def(value, key, arrayMethods[key])
          }
        }
      }
      //如果不是浅层观察，则递归观察数组中的每一项
      if (!shallow) {
        this.observeArray(value)
      }
    } else {
      /**
       * Walk through all properties and convert them into
       * getter/setters. This method should only be called when
       * value type is Object.
       */
      //如果值是普通对象
      //遍历对象的所有属性，转换为getter/setter
      const keys = Object.keys(value)
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        //将对象数据转化成响应式数据核心方法
        defineReactive(value, key, NO_INITIAL_VALUE, undefined, shallow, mock)
      }
    }
  }

  /**
   * Observe a list of Array items.
   */
  //观察数组中的每一项
  observeArray(value: any[]) {
    for (let i = 0, l = value.length; i < l; i++) {
      observe(value[i], false, this.mock)
    }
  }
}

// helpers

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
/**
 * 【重点】
 * @param value  需要观察的值
 * @param shallow  是否执行浅层观察
 * @param ssrMockReactivity 是否在服务器渲染时模拟响应性 
 * @returns 如果成功观察到，则返回 Observer 实例，否则返回 void。【Observer | void】
 */
export function observe(
  value: any,
  shallow?: boolean,
  ssrMockReactivity?: boolean
): Observer | void {
  //判断value.__ob__ 这个对象是否是Observer构造函数的实例
  //检查值是否已经有__ob__属性并且该属性是Observer的实例
  if (value && hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    //返回现有的观察者实例
    return value.__ob__ 
  }
  //创建新的观察者实例的条件判断
  if (
    shouldObserve && //全局标志，确定是否进行观察
    (ssrMockReactivity || !isServerRendering()) && //确保在非服务端渲染时或者模拟响应性时启用响应性
    (isArray(value) || isPlainObject(value)) && //值必须是数组或者普通对象
    Object.isExtensible(value) && //必须是可扩展的（即未被密封）
    !value.__v_skip /* ReactiveFlags.SKIP */ && //值不能被标记为跳过观察
    !isRef(value) && //值不能是 ref 对象
    !(value instanceof VNode) //值不能是 Vue 虚拟节点
  ) {
    //创建一个新的Observer实例来观察该值
    return new Observer(value, shallow, ssrMockReactivity)
  }
  //不满足条件返回void
}

/**
 * Define a reactive property on an Object.
 */
/**
 * 在对象上定义一个响应式属性
 * @param obj 要定义属性的对象
 * @param key 要定义的属性的名称
 * @param val  可选，属性的初始值
 * @param customSetter  可选，自定义的 setter 函数
 * @param shallow 可选，是否进行浅层观察
 * @param mock 可选，是否模拟对象
 * @param observeEvenIfShallow 默认为 false，即使是浅层观察也进行观察
 * @returns 
 */
export function defineReactive(
  obj: object,
  key: string,
  val?: any,
  customSetter?: Function | null,
  shallow?: boolean,
  mock?: boolean,
  observeEvenIfShallow = false
) {
  //创建一个依赖对象
  const dep = new Dep()
  // 如果属性已存在且不可配置，直接返回
  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set
  if (
    (!getter || setter) &&
    (val === NO_INITIAL_VALUE || arguments.length === 2)
  ) {
    //获取属性初始值
    val = obj[key]
  }
  //观察子对象，决定是否进行深层观察
  let childOb = shallow ? val && val.__ob__ : observe(val, false, mock)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter() {
      const value = getter ? getter.call(obj) : val
      //如果存在正在依赖此属性的 Watcher
      if (Dep.target) {
        //在开发模式下进行依赖收集
        if (__DEV__) {
          dep.depend({
            target: obj,
            type: TrackOpTypes.GET,
            key
          })
        } else {
          //依赖收集 
          dep.depend()
        }
        if (childOb) {
          //子对象依赖收集
          childOb.dep.depend() 
          if (isArray(value)) {
            //数组依赖收集
            dependArray(value) 
          }
        }
      }
      //如果是 ref 类型且不是浅层观察，返回其值
      return isRef(value) && !shallow ? value.value : value
    },
    set: function reactiveSetter(newVal) {
      const value = getter ? getter.call(obj) : val
      //新旧值相同则直接返回
      if (!hasChanged(value, newVal)) {
        return
      }
      if (__DEV__ && customSetter) {
        //在开发环境下调用自定义的 setter 函数
        customSetter()
      }
      if (setter) {
        //使用属性的原始 setter 函数
        setter.call(obj, newVal)
      } else if (getter) {
        // #7981: for accessor properties without setter
        return
      } else if (!shallow && isRef(value) && !isRef(newVal)) {
        //处理 ref 类型属性的赋值
        value.value = newVal
        return
      } else {
        //更新属性值
        val = newVal
      }
      childOb = shallow ? newVal && newVal.__ob__ : observe(newVal, false, mock)
      if (__DEV__) {
        //发送属性变更通知
        dep.notify({
          type: TriggerOpTypes.SET,
          target: obj,
          key,
          newValue: newVal,
          oldValue: value
        })
      } else {
        dep.notify()
      }
    }
  })
  //返回依赖对象
  return dep
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set<T>(array: T[], key: number, value: T): T
export function set<T>(object: object, key: string | number, value: T): T
export function set(
  target: any[] | Record<string, any>,
  key: any,
  val: any
): any {
  if (__DEV__ && (isUndef(target) || isPrimitive(target))) {
    warn(
      `Cannot set reactive property on undefined, null, or primitive value: ${target}`
    )
  }
  if (isReadonly(target)) {
    __DEV__ && warn(`Set operation on key "${key}" failed: target is readonly.`)
    return
  }
  const ob = (target as any).__ob__
  if (isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    // when mocking for SSR, array methods are not hijacked
    if (ob && !ob.shallow && ob.mock) {
      observe(val, false, true)
    }
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  if ((target as any)._isVue || (ob && ob.vmCount)) {
    __DEV__ &&
      warn(
        'Avoid adding reactive properties to a Vue instance or its root $data ' +
          'at runtime - declare it upfront in the data option.'
      )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val, undefined, ob.shallow, ob.mock)
  if (__DEV__) {
    ob.dep.notify({
      type: TriggerOpTypes.ADD,
      target: target,
      key,
      newValue: val,
      oldValue: undefined
    })
  } else {
    ob.dep.notify()
  }
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del<T>(array: T[], key: number): void
export function del(object: object, key: string | number): void
export function del(target: any[] | object, key: any) {
  if (__DEV__ && (isUndef(target) || isPrimitive(target))) {
    warn(
      `Cannot delete reactive property on undefined, null, or primitive value: ${target}`
    )
  }
  if (isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target as any).__ob__
  if ((target as any)._isVue || (ob && ob.vmCount)) {
    __DEV__ &&
      warn(
        'Avoid deleting properties on a Vue instance or its root $data ' +
          '- just set it to null.'
      )
    return
  }
  if (isReadonly(target)) {
    __DEV__ &&
      warn(`Delete operation on key "${key}" failed: target is readonly.`)
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  if (__DEV__) {
    ob.dep.notify({
      type: TriggerOpTypes.DELETE,
      target: target,
      key
    })
  } else {
    ob.dep.notify()
  }
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray(value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    if (e && e.__ob__) {
      e.__ob__.dep.depend()
    }
    if (isArray(e)) {
      dependArray(e)
    }
  }
}
