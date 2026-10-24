export type PersonaAlias = { slug: string; githubLogin: string; displayName: string };

export const PERSONA_ALIASES: readonly PersonaAlias[] = [
  { slug: 'BilkoBibitkov', githubLogin: 'StanislavBG', displayName: 'Bilko Bibitkov' },
];

export function resolvePersona(login: string): PersonaAlias | null {
  const l = login.toLowerCase();
  return (
    PERSONA_ALIASES.find((p) => p.slug.toLowerCase() === l || p.githubLogin.toLowerCase() === l) ?? null
  );
}

export function maskPersona<T>(data: T, persona: PersonaAlias): T {
  const json = JSON.stringify(data).split(persona.githubLogin).join(persona.displayName);
  return JSON.parse(json) as T;
}
