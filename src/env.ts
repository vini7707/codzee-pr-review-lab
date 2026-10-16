export type Environment = Readonly<Record<string, string | undefined>>;

/** Expand ${NAME} and ${NAME:-fallback} in string values, recursively.
 * A backslash before a placeholder escapes it: \${NAME} becomes ${NAME}.
 */
export function resolveEnvironment<T>(input: T, environment: Environment): T {
  const visit = (value: unknown, path: string): unknown => {
    if (typeof value === "string") return expandString(value, environment, path);
    if (Array.isArray(value)) return value.map((item, index) => visit(item, `${path}[${index}]`));
    if (value !== null && typeof value === "object") {
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) return value;
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, visit(child, `${path}.${key}`)]));
    }
    return value;
  };
  return visit(input, "$") as T;
}

function expandString(source: string, environment: Environment, path: string): string {
  return source.replace(/\\?\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-([^}]*))?\}/g, (token, name: string, fallback: string | undefined) => {
    if (token.startsWith("\\$")) return token.slice(1);
    const value = environment[name];
    if (value !== undefined && value !== "") return value;
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing environment variable ${name} at ${path}`);
  });
}
