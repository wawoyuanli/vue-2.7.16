import config from '../config'
import { DebuggerOptions, DebuggerEventExtraInfo } from 'v3'

let uid = 0

const pendingCleanupDeps: Dep[] = []

export const cleanupDeps = () => {
  for (let i = 0; i < pendingCleanupDeps.length; i++) {
    const dep = pendingCleanupDeps[i]
    dep.subs = dep.subs.filter(s => s)
    dep._pending = false
  }
  pendingCleanupDeps.length = 0
}

/**
 * @internal
 */
export interface DepTarget extends DebuggerOptions {
  id: number
  addDep(dep: Dep): void
  update(): void
}

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * @internal
 */
/**
 * subs:用来存储Watcher对象
 * Dep依赖关系管理的类，存储订阅者（即观察者Watcher）
 */
export default class Dep {
  static target?: DepTarget | null
  id: number
  subs: Array<DepTarget | null>
  // pending subs cleanup
  _pending = false

  constructor() {
    this.id = uid++
    this.subs = [] //subs 数组用来存储 Watcher 对象
  }
 //添加Watcher
  addSub(sub: DepTarget) {
    this.subs.push(sub)
  }
 
  //移除Watcher对象
  removeSub(sub: DepTarget) {
    // #12696 deps with massive amount of subscribers are extremely slow to
    // clean up in Chromium
    // to workaround this, we unset the sub for now, and clear them on
    // next scheduler flush.
    this.subs[this.subs.indexOf(sub)] = null
    if (!this._pending) {
      this._pending = true
      pendingCleanupDeps.push(this)
    }
  }
  //当前Dep对象收集依赖
  depend(info?: DebuggerEventExtraInfo) {
    //如果存在依赖此属性的Watcher
    if (Dep.target) {
      //将当前 Dep 对象添加到 Watcher 的依赖列表中
      Dep.target.addDep(this)
      if (__DEV__ && info && Dep.target.onTrack) {
        Dep.target.onTrack({
          effect: Dep.target,
          ...info
        })
      }
    }
  }
  //通知所有依赖于该 Dep 对象的 Watcher 执行更新操作
  notify(info?: DebuggerEventExtraInfo) {
    // stabilize the subscriber list first
    const subs = this.subs.filter(s => s) as DepTarget[]
    if (__DEV__ && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      const sub = subs[i]
      if (__DEV__ && info) {
        sub.onTrigger &&
          sub.onTrigger({
            effect: subs[i],
            ...info
          })
      }
      sub.update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
///静态属性，用来存储当前正在执行的 Watcher 对象
Dep.target = null
const targetStack: Array<DepTarget | null | undefined> = []

//将指定的 Watcher 对象推入 Watcher 栈中
export function pushTarget(target?: DepTarget | null) {
  targetStack.push(target)
  //将当前 Watcher 对象赋值给 Dep.target
  Dep.target = target
}

//从 Watcher 栈中弹出最后一个 Watcher 对象
export function popTarget() {
  targetStack.pop()
  //恢复 Watcher 栈的上一个 Watcher 对象
  Dep.target = targetStack[targetStack.length - 1]
}
