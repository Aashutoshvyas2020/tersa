export function isHelpInvocation(args: string[]): boolean {
  return args.includes('--help') || args.includes('-h')
}
