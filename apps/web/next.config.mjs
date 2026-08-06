/** @type {import('next').NextConfig} */
const nextConfig = {
  // Os pacotes do monorepo sao publicados como TypeScript puro (sem build).
  // O Next compila os dois junto com o app — assim `npm run dev` recarrega
  // na hora quando alguem mexe numa regra de negocio em packages/core.
  transpilePackages: ['@atria/core', '@atria/bot'],

  eslint: {
    dirs: ['app', 'components', 'actions', 'lib'],
  },
};

export default nextConfig;
