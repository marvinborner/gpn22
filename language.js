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

const toHigherOrder = (t) => {
  const go = (env) => (t) => {
    switch (t.constructor) {
      case "application":
        return higherOrderApplication(go(env)(t.left))(go(env)(t.right));
      case "abstraction":
        return higherOrderAbstraction((x) =>
          go({ ...env, [t.name]: x })(t.body),
        );
      case "symbol":
        if (t.name in env) return env[t.name];
        throw Error("unbound symbol " + t.name);
      default:
        throw Error("unexpected " + t.constructor);
    }
  };
  return go({})(t);
};

const fromHigherOrder = (t) => {
  const go = (d) => (t) => {
    // t = t();
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
  return go(0)(t);
};

const reduce = (term) => {
  return fromHigherOrder(toHigherOrder(term));
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
    if (head == "(") {
      const [left, tail1] = go(tail);
      const [right, tail2] = go(tail1);
      return [application(left)(right), tail2.trim().slice(1)];
    }

    // application end - already consumed above
    if (head == ")") {
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
    .filter((line) => !(line.startsWith("//") || line.trim() == ""))
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
