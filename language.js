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

const abstraction = (name) => (body) => ({
  constructor: "abstraction",
  name,
  body,
});

const higherOrderAbstraction = (f) => ({ constructor: "h-abstraction", f });

const application = (left) => (right) => ({
  constructor: "application",
  left,
  right,
});

const higherOrderApplication = (left) =>
  left.constructor == "h-abstraction" ? left.f : application(left);

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

const toHigherOrder = () => {
  const go = (env) => (t) => {
    switch (t.constructor) {
      case "application":
        return higherOrderApplication(go(env)(t.left))(go(env)(t.right));
      case "abstraction":
        return higherOrderAbstraction((x) =>
          go(Object.assign({ ...env }, { [t.name]: x }))(t.body),
        );
      case "symbol":
        if (t.name in env) return env[t.name];
        console.warn("unbound symbol " + t.name);
        return t;
      default:
        throw Error("unexpected " + t.constructor);
    }
  };
  return go({});
};

const fromHigherOrder = () => {
  const go = (d) => (t) => {
    switch (t.constructor) {
      case "application":
        return application(go(d)(t.left))(go(d)(t.right));
      case "h-abstraction":
        const name = intToName(d);
        return abstraction(name)(go(d + 1)(t.f(symbol(name))));
      case "symbol":
        return t;
      default:
        throw Error("unexpected " + t.constructor);
    }
  };
  return go(0);
};

const reduce = (term) => {
  console.log(term);
  return fromHigherOrder()(toHigherOrder()(term));
};

// -----
// JS IO
// -----

const fs = require("fs");

const readChar = () => {
  const buffer = Buffer.alloc(1);
  fs.readSync(0, buffer, 0, 1);
  return buffer.toString("utf8");
};

// -------
// PARSING
// -------

let overflow = "";
const readNext = () => {
  let ch = "";
  if (overflow) {
    ch = overflow;
    overflow = "";
    return ch;
  }
  while ((ch = readChar()).trim() == "") continue;
  return ch;
};

const consume = (predicate) => {
  let out = "";
  let ch = readNext();
  while (predicate(ch)) {
    out += ch;
    ch = readChar();
    overflow = ch;
  }
  return out;
};

const isSymbol = (x) => x >= "a" && x <= "z";

const isDefinition = (x) => x >= "A" && x <= "Z";

const parse = () => {
  const head = readNext();

  // abstraction start
  if ("\\λ".includes(head)) {
    const name = consume(isSymbol);
    const body = parse();
    return abstraction(name)(body);
  }

  // application start
  if (head == "(") {
    const left = parse();
    const right = parse();
    readNext(); // skip )
    return application(left)(right);
  }

  // application end - already consumed above
  if (head == ")") {
    throw Error("unexpected " + head);
  }

  // symbol / variable (lowercase letters)
  if (isSymbol(head)) {
    const sym = consume(isSymbol);
    return symbol(sym);
  }

  // definition (uppercase letters)
  if (isDefinition(head)) {
    const name = consume(isDefinition);
    return definition(name);
  }
};

// ---
// CLI
// ---

console.log(show(reduce(parse())));
