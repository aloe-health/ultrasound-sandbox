# Prompts

Here are some of the prompts I used to build this project.

**WIP**

## 08/18/2025
Let's build the following project in typescript:

Let's write some code to calculate a phased array beamformer.

We should be able to configure the number of elements, the distance between elements (in terms of wavelength or distance), the frequency of the signal, and the desired direction of the beam (in degrees). There should be presets for different beam profiles (e.g. hamming, rectangular, triangular, chebyshev). And each weight should be individually adjustable as well. Then we calculate the beam intensity across all angles and plot it. We should then be able to save the beamformer configuration (CSV) and use it later. We should also be able to calculate the phase delay of each element (in terms of radians and time delay, using the frequency), and export that alongside in the CSV.

The functionality should be broken up nicely so we can take some of the best parts (e.g. a function to generate a chebyshev beamforming profile for 64 elements, exporting the weights and delays), and use it somewhere else (e.g. a time simulation of wave propogation).

Overall, we should build this in a typescript project that has both a react app and a node.js server, so we can run scripts from the CLI (integrated into other workflows, e.g. rust) or mess around with the visuals.

Here's a suggestion of how we might lay things out:

```txt
aloe/product/sandbox/typescript-sim/
  package.json           # workspaces
  tsconfig.base.json

  packages/
    core/
      src/
        index.ts
        api/
          processThing.ts
        ports/
          storage.ts      # interfaces only
      package.json
      tsconfig.json

    adapters/
      node/
        src/storageNode.ts   # implements storage port using fs
      web/
        src/storageWeb.ts    # implements storage port using localStorage/IndexedDB
      package.json
      tsconfig.json

  apps/
    cli/
      src/index.ts
      package.json
      tsconfig.json
    web/
      src/
        components/
        pages/
          BeamformProfilePage.tsx
        App.tsx
      index.html
      package.json
      tsconfig.json
      vite.config.ts
```

Build me this app, giving me all relevant commands and files. We can build it in stages but write every file in it's fullness.

## Bunify
Additionally, let's change this entire folder to use `bun` instead of `npm` and `node`.
