import{aG as u,aa as p}from"./iframe-aoIC7NDi.js";function d(t,e){for(var r=0;r<e.length;r++){const s=e[r];if(typeof s!="string"&&!Array.isArray(s)){for(const o in s)if(o!=="default"&&!(o in t)){const a=Object.getOwnPropertyDescriptor(s,o);a&&Object.defineProperty(t,o,a.get?a:{enumerable:!0,get:()=>s[o]})}}}return Object.freeze(Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}))}var i={exports:{}},n={},c;function m(){if(c)return n;c=1;/**
 * @license React
 * react-dom-test-utils.development.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */return(function(){var t=u(),e=!1;n.act=function(r){return e===!1&&(e=!0,console.error("`ReactDOMTestUtils.act` is deprecated in favor of `React.act`. Import `act` from `react` instead of `react-dom/test-utils`. See https://react.dev/warnings/react-dom-test-utils for more info.")),t.act(r)}})(),n}var f;function v(){return f||(f=1,i.exports=m()),i.exports}var l=v();const g=p(l),R=d({__proto__:null,default:g},[l]);export{R as t};
