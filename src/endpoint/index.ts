import glob from 'glob';

let resolverModules: Function[] = [];

glob(__dirname + '/*Resolver.ts', async function (er: any, files: string[]) {
  files.forEach(async (file) => {
    const { default: resolver } = await import(file);
    resolverModules.push(resolver);
  });
});

export const resolvers = resolverModules as [Function];
