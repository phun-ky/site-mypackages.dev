type Deps = Record<string, string> | undefined;

/** What a version needs installed: its dependencies, peer and optional ones */
export const dependsOn = (
  manifest?: {
    dependencies?: Deps;
    peerDependencies?: Deps;
    optionalDependencies?: Deps;
  } | null
): string[] => [
  ...new Set(
    [
      manifest?.dependencies,
      manifest?.peerDependencies,
      manifest?.optionalDependencies
    ].flatMap((deps) => Object.keys(deps ?? {}))
  )
];
