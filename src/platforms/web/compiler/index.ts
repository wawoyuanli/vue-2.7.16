import { baseOptions } from './options'
import { createCompiler } from 'compiler/index'
/* 平台入口页compiler */
const { compile, compileToFunctions } = createCompiler(baseOptions)

export { compile, compileToFunctions }
