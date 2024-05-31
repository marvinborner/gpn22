const intToName = (num) => {
  let out = "";
  for (let n = num + 1; n > 0; n--) {
    out += String.fromCharCode(97 + (--n % 26));
    n = Math.floor(n / 26);
  }
  return out;
};

// ------------
// CONSTRUCTORS
// ------------

const abstraction = (name) => (body) => ({ constructor: "abstraction", name, body });

const application = (left) => (right) => ({ constructor: "application", left, right });

const symbol = (name) => ({ constructor: "symbol", name });

const definition = (name) => ({ constructor: "definition", name });

const show = (term) => {
  switch (term.constructor) {
    case "abstraction":
      return `λ${term.name}.${show(term.body)}`;
    case "application":
      return `(${show(term.left)} ${show(term.right)})`;
    case "symbol":
      return `${term.name}`;
  }
};

// ---------
// REDUCTION
// ---------

// This is a very inefficient reduction method using normal order.
// It uses de Bruijn indices to bypass alpha conversion.
// It first reduces the outer redex (WHNF), then recursively reduces
// the nested terms.

// increment de Bruijn indices that reach out of the current environment
const increment = (i, t) => {
  switch (t.constructor) {
    case "symbol":
      return symbol(i <= t.name ? t.name + 1 : t.name);
    case "application":
      return application(increment(i, t.left))(increment(i, t.right));
    case "abstraction":
      return abstraction(null)(increment(i + 1, t.body));
  }
};

// substitute de Bruijn index in term with other term
const substitute = (i, t, s) => {
  switch (t.constructor) {
    case "symbol":
      return i === t.name ? s : symbol(t.name > i ? t.name - 1 : t.name);
    case "application":
      return application(substitute(i, t.left, s))(substitute(i, t.right, s));
    case "abstraction":
      return abstraction(null)(substitute(i + 1, t.body, increment(0, s)));
  }
};

// weak-head normal form (substitute until no outer redex)
const whnf = (t) => {
  if (t.constructor === "application") {
    const _left = whnf(t.left);
    return _left.constructor === "abstraction"
      ? whnf(substitute(0, _left.body, t.right))
      : application(_left)(t.right);
  }
  return t;
};

// reduce to normal form
const nf = (t) => {
  const w = whnf(t);
  switch (w.constructor) {
    case "abstraction":
      return abstraction(null)(nf(w.body));
    case "application":
      return application(nf(w.left))(nf(w.right));
  }
  return w;
};

// convert from/to de Bruijn indices
// we do this to bypass alpha conversion (potential problems with shadowed variables)
const toggleDeBruijn = (t, bruijn) => {
  const go = (env) => (t) => {
    switch (t.constructor) {
      case "application":
        return application(go(env)(t.left))(go(env)(t.right));
      case "abstraction":
        if (!bruijn) return abstraction(null)(go([t.name, ...env])(t.body));
        const name = intToName(env.length);
        return abstraction(name)(go([name, ...env])(t.body));
      case "symbol":
        if (!bruijn) return symbol(env.indexOf(t.name));
        return symbol(env[t.name]);
      default:
        throw Error("unexpected " + t.constructor);
    }
  };
  return go([])(t);
};

const reduce = (term) => {
  return toggleDeBruijn(nf(toggleDeBruijn(term, false)), true);
};

// -------
// PARSING
// -------

const consume = (str) => (predicate) => {
  let out = "";
  while (str && predicate(str[0])) {
    out += str[0];
    str = str.slice(1);
  }
  return [out, str.trim()];
};

const isSymbol = (x) => x >= "a" && x <= "z";

const isDefinition = (x) => (x >= "A" && x <= "Z") || (x >= "0" && x <= "9");

const parseTerm = (program) => {
  const go = (str) => {
    // skip spaces
    str = str.trim();

    const head = str[0];
    const tail = str.slice(1).trim();

    // abstraction start
    if ("\\λ".includes(head)) {
      const [name, tail1] = consume(tail)(isSymbol);
      const tail2 = tail1.slice(1).trim(); // skip .
      const [body, tail3] = go(tail2);
      return [abstraction(name)(body), tail3];
    }

    // application start
    if (head === "(") {
      const [left, tail1] = go(tail);
      const [right, tail2] = go(tail1);
      return [application(left)(right), tail2.trim().slice(1)];
    }

    // application end - already consumed above
    if (head === ")") {
      throw Error("unexpected " + head);
    }

    // symbol / variable (lowercase letters)
    if (isSymbol(head)) {
      const [sym, tail1] = consume(str)(isSymbol);
      return [symbol(sym), tail1];
    }

    // definition (uppercase letters)
    if (isDefinition(head)) {
      const [name, tail1] = consume(str)(isDefinition);
      return [definition(name), tail1];
    }

    throw Error("unexpected " + head);
  };

  const [term, tail] = go(program);
  if (tail != "") throw Error("unexpected " + tail);
  return term;
};

const parse = (program) => {
  const definitions = {};

  const substituteDefinition = (t) => {
    switch (t.constructor) {
      case "application":
        return application(substituteDefinition(t.left))(
          substituteDefinition(t.right),
        );
      case "abstraction":
        return abstraction(t.name)(substituteDefinition(t.body));
      case "symbol":
        return t;
      case "definition":
        if (t.name in definitions) return definitions[t.name];
        else throw Error("invalid definition " + t.name);
      default:
        throw Error("unexpected " + t.constructor);
    }
  };

  program
    .trim()
    .split("\n")
    .filter((line) => !(line.startsWith("//") || line.trim() === ""))
    .forEach((line) => {
      const [definition, term] = line.split("=");
      definitions[definition.trim()] = substituteDefinition(
        parseTerm(term.trim()),
      );
    });
  if (!("MAIN" in definitions)) throw Error("no 'MAIN' definition");
  return definitions["MAIN"];
};

// ---
// CLI
// ---

const data = require("fs").readFileSync("/dev/stdin");
console.log(show(reduce(parse(data + ""))));
