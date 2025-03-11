import { inBrowser } from 'core/util/index'

// check whether current browser encodes a char inside attribute values
/*
 如果 shouldDecodeNewlines 为 true，意味着 Vue 在编译模板的时候，
 要对属性值中的换行符或制表符做兼容处理。
 而shouldDecodeNewlinesForHref为true 意味着Vue在编译模板的时候，
 要对a标签的 href 属性值中的换行符或制表符做兼容处理。
*/
let div
function getShouldDecode(href: boolean): boolean {
  div = div || document.createElement('div')
  div.innerHTML = href ? `<a href="\n"/>` : `<div a="\n"/>`
  return div.innerHTML.indexOf('&#10;') > 0
}

// #3663: IE encodes newlines inside attribute values while other browsers don't
export const shouldDecodeNewlines = inBrowser ? getShouldDecode(false) : false
// #6828: chrome encodes content in a[href]
export const shouldDecodeNewlinesForHref = inBrowser
  ? getShouldDecode(true)
  : false
