import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  invokeWithErrorHandling,
  noop,
  isFunction
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget, DepTarget } from './dep'
import { DebuggerEvent, DebuggerOptions } from 'v3/debug'

import type { SimpleSet } from '../util/index'
import type { Component } from 'types/component'
import { activeEffectScope, recordEffectScope } from 'v3/reactivity/effectScope'

let uid = 0

/**
 * @internal
 */
export interface WatcherOptions extends DebuggerOptions {
  deep?: boolean
  user?: boolean
  lazy?: boolean
  sync?: boolean
  before?: Function
}

/** 
 * 观察者、依赖者、订阅者
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 * @internal
 */
/**
 * DepTarget:[addDep,update]:添加依赖和更新
 * [onTrack,onTrigger]
 */
export default class Watcher implements DepTarget {
  vm?: Component | null //Vue实例
  expression: string
  cb: Function //回调函数，数据变化时触发
  id: number
  deep: boolean
  user: boolean
  lazy: boolean
  sync: boolean
  dirty: boolean
  active: boolean
  deps: Array<Dep>
  newDeps: Array<Dep>
  depIds: SimpleSet
  newDepIds: SimpleSet
  before?: Function
  onStop?: Function
  noRecurse?: boolean
  getter: Function //数据获取函数
  value: any //初始化时执行get函数获取当前数据的值
  post: boolean

  // dev only
  onTrack?: ((event: DebuggerEvent) => void) | undefined
  onTrigger?: ((event: DebuggerEvent) => void) | undefined

  constructor(
    vm: Component | null, //Vue类/组件 实例
    expOrFn: string | (() => any), //字符表达式或者函数
    cb: Function, //回调函数，收到更新通知时执行
    options?: WatcherOptions | null, //其他选项
    isRenderWatcher?: boolean //是否为渲染watcher
  ) {
    recordEffectScope(
      this,
      // if the active effect scope is manually created (not a component scope),
      // prioritize it
      activeEffectScope && !activeEffectScope._vm
        ? activeEffectScope
        : vm
        ? vm._scope
        : undefined
    )
    /* 触发组件渲染 */
    if ((this.vm = vm) && isRenderWatcher) {
      vm._watcher = this
    }
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy //用于computed watcher，值为true时，不会执行run方法
      this.sync = !!options.sync //用于watch watcher，值为true时，同步执行run方法，执行更新。
      this.before = options.before //用于触发beforeUpdate钩子
      if (__DEV__) {
        this.onTrack = options.onTrack
        this.onTrigger = options.onTrigger
      }
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.post = false
    this.dirty = this.lazy // for lazy watchers 始化 dirty = lazy，主要用于计算属性
    this.deps = [] //当前观察的dep
    this.newDeps = [] //新收集的需要观察的dep
    this.depIds = new Set()
    this.newDepIds = new Set() //防止重复收集依赖
    this.expression = __DEV__ ? expOrFn.toString() : ''
    // parse expression for getter
    if (isFunction(expOrFn)) {
      this.getter = expOrFn //expOrFn 转成 getter 函数
    } else {
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        __DEV__ &&
          warn(
            `Failed watching path: "${expOrFn}" ` +
              'Watcher only accepts simple dot-delimited paths. ' +
              'For full control, use a function instead.',
            vm
          )
      }
    }
    //如果不是 lazy 的 watcher 则立即执行 get 成员方法
    this.value = this.lazy ? undefined : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  //评估getter函数 建立依赖关系
  /**
   * 
    1、将Dep类的静态属性target设置为当前watcher，并推入存储watcher的栈中
    2、然后执行getter函数。
      computedWatcher：执行getter函数，其实就是执行computed属性的对应的函数或者get，如果执行的函数里，有依赖到其他属性，这时就会建立其他属性和当前computedWatcher的依赖关系
      userWatcher：执行getter方法，其实就是获取当前属性的值，并设置当前userWatcher.value
      renderWatcher: 执行updateComponent函数，即执行render和patch，在render阶段时，如果读取到组件里的属性，依旧会触发属性的get，即同时与renderWatcher建立依赖关系
    3、将Dep类的静态属性target设置为当前watcher，并退出存储watcher的栈
   */
  get() {
    //将当前Watcher对象推入Watcher栈中
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      //调用 getter 求值，触发响应式变量的 getter 收集依赖
      //执行 updateComponent 
      //执行 updateComponent 时，会触发 Observe 类中定义的 get(数据劫持) 方法
      //建立watcher实例与dep实例的关联，对于三种watcher都适用
      value = this.getter.call(vm, vm)
    } catch (e: any) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      //仅对watch watcher实例适用
      if (this.deep) {
        //如果需要，则对 value 的属性递归求值和收集依赖
        traverse(value)
      }
      //出栈，恢复 Dep.target 为之前备份的 Watcher 对象
      popTarget()
      //新旧依赖过滤，移除不需要的依赖
      //执行到此时，表明当前watcher的依赖收集完毕，需要将newDepIds和newDeps的值分别赋给depIds和deps，
      // 并且将newDepIds和newDeps的值清空，等待下一次页面更新时，重新收集依赖；
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  addDep(dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        //this.subs.push(watcher|this)
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  cleanupDeps() {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp: any = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   * update函数触发时机：watcher所观察的属性 触发更新
   update函数执行流程：
    1、如果this.lazy为true，即当前watcher属于computedWatcher，只是设置dirty属性
    2、如果this.sync, 执行run函数
    3、否则将当前watcher入队，后面在异步更新时，会遍历执行watcher的run方法
   */
  update() {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
    } else {
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   * 
  run函数触发时机是 vue执行异步更新时，会遍历触发watcher的run函数
  run函数执行流程：
  1、执行get函数
  2、如果是userWatcher，要执行cb 回调函数
   */
  run() {
    if (this.active) {
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        this.value = value
        if (this.user) {
          const info = `callback for watcher "${this.expression}"`
          invokeWithErrorHandling(
            this.cb,
            this.vm,
            [value, oldValue],
            this.vm,
            info
          )
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate() {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend() {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown() {
    if (this.vm && !this.vm._isBeingDestroyed) {
      remove(this.vm._scope.effects, this)
    }
    if (this.active) {
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
      if (this.onStop) {
        this.onStop()
      }
    }
  }
}

// watcher.get函数作用一是获取对应属性的值，二是与观察的属性建立关系的过程
// 不同watcher执行的get：computedWatcher执行get会执行属性所对应的函数，同时与依赖属性的dep建立关系，并返回值。userWatcher即会通过属性名，获取到组件的属性的值。renderWatcher则是执行updateComponent函数，首次执行是初始化和挂载组件，后面则是执行组件更新
// 当属性改变时，执行的是watcher的update。除了computedWatcher外，userWatcher和renderWatcher都会进入异步刷新队列，即执行queueWatcher(this)
// userWatcher和renderWatcher执行更新，最终会执行watcher.run函数
// watcher.run函数主要执行 get函数 和 cb回调函数。因为renderWatcher的cb传的是空函数，所以renderWatcher的run主要还是执行get函数，即更新函数updateComponent。userWatcher则需要先执行get函数获取到新的值，并传入cb回调函数
