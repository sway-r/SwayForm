/* Simulation settings for the portal. Model assets stay null until the Model S1 URDF and the joint contract are imported. */

export const SIM_CONFIG = {
  // Who sees the Simulation window: 'admins' while it is being built, 'full-access' at launch.
  visibleTo: 'admins',
  // Static files served from this site, e.g. '/sim-assets/s1/<commit>/model.urdf'.
  modelUrl: null,
  // Mesh paths in the URDF (package://<name>/...) resolve under this folder.
  meshPackages: {},
  contractUrl: null,
};

export function simVisible({ admin, fullAccess }){
  return SIM_CONFIG.visibleTo === 'admins' ? !!admin : !!fullAccess;
}
