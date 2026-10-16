/** Parse JSON configuration with JavaScript-style comments and trailing commas. */
export function parseConfig(source: string): unknown {
  const normalized = stripTrailingCommas(stripComments(source));
  try {
    return JSON.parse(normalized) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new SyntaxError(`Invalid configuration: ${error.message}`, { cause: error });
    }
    throw error;
  }
}

function stripComments(source: string): string {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];

    if (inString) {
      output += current;
      if (escaped) escaped = false;
      else if (current === "\\") escaped = true;
      else if (current === '"') inString = false;
    } else if (current === '"') {
      inString = true;
      output += current;
    } else if (current === "/" && (next === "/" || next === "*")) {
      const isLine = next === "/";
      output += "  ";
      index += 1;
      if (isLine) {
        while (index + 1 < source.length && source[index + 1] !== "\n") {
          output += " ";
          index += 1;
        }
      } else {
        let closed = false;
        while (index + 1 < source.length) {
          index += 1;
          if (source[index] === "*" && source[index + 1] === "/") {
            output += "  ";
            index += 1;
            closed = true;
            break;
          }
          output += source[index] === "\n" ? "\n" : " ";
        }
        if (!closed) throw new SyntaxError("Invalid configuration: unterminated block comment");
      }
    } else {
      output += current;
    }
  }
  return output;
}

function stripTrailingCommas(source: string): string {
  let output = "";
  let inString = false;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    if (inString) {
      output += current;
      if (escaped) escaped = false;
      else if (current === "\\") escaped = true;
      else if (current === '"') inString = false;
    } else if (current === '"') {
      inString = true;
      output += current;
    } else if (current === ",") {
      let next = index + 1;
      while (/\s/.test(source[next] ?? "")) next += 1;
      if (source[next] !== "}" && source[next] !== "]") output += current;
    } else {
      output += current;
    }
  }
  return output;
}
