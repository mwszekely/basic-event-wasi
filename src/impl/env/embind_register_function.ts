import { PrivateImpl } from "../../types.js";
import { readLatin1String } from "../../util.js";

export function _embind_register_function(this: PrivateImpl, name: number, argCount: number, rawArgTypesAddr: number, signature: number, rawInvoker: number, fn: number, isAsync: number) {
  console.log(`_embind_register_function(${readLatin1String(this.instance, name)}, ${argCount}, ${rawArgTypesAddr}, ${signature}, ${rawInvoker}, ${fn}, ${isAsync})`);
  debugger;
}


/*

type PtrType = "true" | "false" | `${number}` | number;

function isNumber(x: string | number) {
    // XXX this does not handle 0xabc123 etc. We should likely also do x == parseInt(x) (which handles that), and remove hack |// handle 0x... as well|
    return x == parseFloat(x as string) || (typeof x == 'string' && x.match(/^-?\d+$/)) || x == 'NaN';
  }

function getFastValue(a: PtrType, op: '+' | '-', b: PtrType) {
    // In the past we supported many operations, but today we only use addition.
    console.assert(op == '+');
  
    // Convert 'true' and 'false' to '1' and '0'.
    a = a === 'true' ? '1' : (a === 'false' ? '0' : a);
    b = b === 'true' ? '1' : (b === 'false' ? '0' : b);
  
    let aNumber = null;
    let bNumber = null;
    if (typeof a == 'number') {
      aNumber = a;
      a = a.toString();
    } else if (isNumber(a)) {
      aNumber = parseFloat(a);
    }
    if (typeof b == 'number') {
      bNumber = b;
      b = b.toString();
    } else if (isNumber(b)) {
      bNumber = parseFloat(b);
    }
  
    // First check if we can do the addition at compile time
    if (aNumber !== null && bNumber !== null) {
      return (aNumber + bNumber).toString();
    }
  
    // If one of them is a number, keep it last
    if (aNumber !== null) {
      const c = b;
      b = a;
      a = c;
      const cNumber = bNumber;
      bNumber = aNumber;
      aNumber = cNumber;
    }
  
    if (aNumber === 0) {
      return b;
    } else if (bNumber === 0) {
      return a;
    }
  
    if (b[0] === '-') {
      op = '-'
      b = b.substr(1);
    }
  
    return `(${a})${op}(${b})`;
  }


function calcFastOffset(ptr: PtrType, pos: PtrType) {
    return getFastValue(ptr, '+', pos);
  }

export function makeGetValue(ptr: PtrType, pos: number, type: string, noNeedFirst = undefined, unsigned = undefined, ignore = false, align = undefined) {

}

export function heap32VectorToArray(count: number, firstElement: unknown) {
    const ret = [];
    for (let i = 0; i < count; ++i) {
        ret.push(makeGetValue())
    }
}
export function createFunctionDefinition(name: string, argCount: number, rawArgTypeAddr: number, functionIndex: number, hasThis: boolean, isAsync: boolean, cb: () => void) {
    const argTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
}
*/
