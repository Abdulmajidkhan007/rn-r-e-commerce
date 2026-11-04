/** Tiny `--flag value` / `--switch` parser for the backup CLIs. */
export interface ParsedArgs {
  positional: string[];
  flags: Map<string, string | true>;
}

export function parseArgs(argv: readonly string[], switches: readonly string[]): ParsedArgs {
  const positional: string[] = [];
  const flags = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? '';
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const name = arg.slice(2);
    if (switches.includes(name)) {
      flags.set(name, true);
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`--${name} needs a value`);
    flags.set(name, value);
    i++;
  }
  return { positional, flags };
}

export function stringFlag(args: ParsedArgs, name: string): string | undefined {
  const v = args.flags.get(name);
  return typeof v === 'string' ? v : undefined;
}

export function listFlag(args: ParsedArgs, name: string): string[] | undefined {
  const v = stringFlag(args, name);
  return v
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
