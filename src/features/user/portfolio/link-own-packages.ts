/**
 * Keeps in each package's `uses` only the user's own packages, and fills
 * their `usedBy` in the order of `packages` (#160)
 */
export const linkOwnPackages = (
  packages: { name: string; uses: string[]; usedBy: string[] }[]
) => {
  const byName = new Map(packages.map((pkg) => [pkg.name, pkg]));

  for (const pkg of packages) {
    pkg.uses = pkg.uses.filter((name) => name !== pkg.name && byName.has(name));

    for (const name of pkg.uses) byName.get(name)?.usedBy.push(pkg.name);
  }
};
