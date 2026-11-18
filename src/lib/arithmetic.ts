/** Parser local de operaciones básicas. Sin eval ni acceso a servicios. */
export function calculateArithmetic(input:string):number {
  if (!input.trim() || input.length>180) throw new Error('Escribe una operación corta.')
  const text=input.replace(/,/g,'.').replace(/[×xX]/g,'*').replace(/[÷]/g,'/').replace(/−/g,'-').replace(/\s/g,'')
  let position=0
  const fail=()=>{throw new Error('Revisa los números y signos de la operación.')}
  function primary():number{
    if(text[position]==='('){position++;const v=expression();if(text[position]!==')')return fail();position++;return v}
    const match=text.slice(position).match(/^(?:\d+(?:\.\d*)?|\.\d+)/)
    if(!match)return fail()
    position+=match[0].length
    return Number(match[0])
  }
  function unary():number{
    if(text[position]==='+'){position++;return unary()}
    if(text[position]==='-'){position++;return -unary()}
    return primary()
  }
  function product():number{
    let value=unary()
    while(text[position]==='*'||text[position]==='/'){
      const op=text[position++]
      const right=unary()
      if(op==='/'&&right===0)throw new Error('No puedes dividir entre cero.')
      value=op==='*'?value*right:value/right
    }
    return value
  }
  function expression():number{
    let value=product()
    while(text[position]==='+'||text[position]==='-'){
      const op=text[position++]
      const right=product()
      value=op==='+'?value+right:value-right
    }
    return value
  }
  const result=expression()
  if(position!==text.length||!Number.isFinite(result))return fail()
  const rounded=Math.round((result+Number.EPSILON)*1e6)/1e6
  if(!Number.isFinite(rounded))return fail()
  return rounded
}
