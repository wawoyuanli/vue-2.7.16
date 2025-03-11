import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'
import { CompilerOptions, CompiledResult } from 'types/compiler'

//编译入口页 此处没有获取值 [get]
// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.
export const createCompiler = createCompilerCreator(function baseCompile(
  template: string,
  options: CompilerOptions
): CompiledResult {
  //将模版对象编译成ast 
  const ast = parse(template.trim(), options)
  if (options.optimize !== false) {
    //优化编译成的模版
    optimize(ast, options)
  }
  //代码生成器
  const code = generate(ast, options)
  //调用 _c 和 _v 就相当于 vm._c 和 vm._v _s(sock)动态数据，需要从实例去获取
  //with(this){return _c('div',{attrs:{"id":"demo"}},[_v(_s(sock))])}
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
