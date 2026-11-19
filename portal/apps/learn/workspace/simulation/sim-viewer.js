/* Browser 3D view of a Gazebo session. Shows only what the physics engine reports (joint positions, object poses); it never animates on its own. */

// ROS is Z-up with X forward; three.js is Y-up. (x, y, z) in ROS is (x, z, -y) here.
const rosVec = (THREE, [x, y, z]) => new THREE.Vector3(x, z, -y);

// Camera offsets from the model's centre, in ROS axes, scaled to the model's size.
const VIEWS = {
  front: [2.0, 0, 0.2],
  side: [0, 2.0, 0.2],
  top: [0.01, 0, 2.4],
  angle: [1.6, 1.4, 0.7],
};

export async function createViewer(container){
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const world = new THREE.Group();
  world.rotation.x = -Math.PI / 2;
  scene.add(world);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 5, 2);
  scene.add(key);
  const grid = new THREE.GridHelper(4, 40, 0x7a8494, 0xb8c0cc);
  grid.material.transparent = true;
  grid.material.opacity = 0.55;
  scene.add(grid);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.minDistance = 0.2;
  controls.maxDistance = 12;
  let target = rosVec(THREE, [0, 0, 0.4]);
  let frameScale = 1;

  let robot = null;
  const objects = new Map();
  let needsRender = true;
  let frameId = 0;
  let disposed = false;
  const unknownJoints = new Set();

  function setView(name){
    const p = VIEWS[name] || VIEWS.angle;
    camera.position.copy(rosVec(THREE, p)).multiplyScalar(frameScale).add(target);
    controls.target.copy(target);
    controls.update();
    needsRender = true;
  }

  function resize(){
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    needsRender = true;
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();
  setView('angle');

  controls.addEventListener('change', () => { needsRender = true; });
  function loop(){
    if (disposed) return;
    frameId = requestAnimationFrame(loop);
    if (document.hidden) return;
    controls.update();
    if (!needsRender) return;
    needsRender = false;
    renderer.render(scene, camera);
  }
  loop();

  return {
    // Loads the same URDF the simulation spawned; returns its joints for the contract cross-check.
    async loadModel(url, packages){
      const { default: URDFLoader } = await import('urdf-loader');
      const loader = new URDFLoader();
      loader.packages = packages || {};
      const model = await loader.loadAsync(url);
      if (disposed) return [];
      if (robot) world.remove(robot);
      robot = model;
      Object.values(robot.joints).forEach((j) => { j.ignoreLimits = true; });
      world.add(robot);
      const box = new THREE.Box3().setFromObject(robot);
      const size = box.getSize(new THREE.Vector3());
      target = box.getCenter(new THREE.Vector3());
      frameScale = Math.max(size.length() / 1.2, 0.5);
      setView('angle');
      return Object.values(robot.joints).map((j) => ({ name: j.name, type: j.jointType, mimic: j.mimicJoint || null }));
    },

    // A Gazebo joint_state frame: measured positions in radians (or metres), by name.
    applyJoints(frame){
      if (!robot || !frame || !Array.isArray(frame.name)) return;
      frame.name.forEach((name, i) => {
        if (robot.joints[name]) robot.setJointValue(name, frame.position[i]);
        else unknownJoints.add(name);
      });
      needsRender = true;
    },

    // World poses of free objects (later: interactive objects). Each object's mesh is registered by name.
    applyPoses(frame){
      if (!frame || !Array.isArray(frame.models)) return;
      frame.models.forEach((m) => {
        const obj = objects.get(m.name);
        if (!obj) return;
        obj.position.set(m.p[0], m.p[1], m.p[2]);
        obj.quaternion.set(m.q[0], m.q[1], m.q[2], m.q[3]);
      });
      needsRender = true;
    },

    addObject(name, object3d){ objects.set(name, object3d); world.add(object3d); needsRender = true; },
    hasModel: () => !!robot,
    unknownJoints: () => [...unknownJoints],
    setView,
    dispose(){
      disposed = true;
      cancelAnimationFrame(frameId);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
