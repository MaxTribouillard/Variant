(function() {
  const logBox = document.createElement("div");
  logBox.style.position = "fixed";
  logBox.style.top = "0";
  logBox.style.left = "0";
  logBox.style.width = "100%";
  logBox.style.maxHeight = "50vh";
  logBox.style.background = "rgba(0,0,0,0.85)";
  logBox.style.color = "#0f0";
  logBox.style.fontSize = "12px";
  logBox.style.overflowY = "auto";
  logBox.style.padding = "10px";
  logBox.style.zIndex = "999999";
  logBox.style.fontFamily = "monospace";
  document.body.appendChild(logBox);

  const print = (...args) => {
    logBox.innerHTML += args.join(" ") + "<br>";
    logBox.scrollTop = logBox.scrollHeight;
  };

  const originalLog = console.log;
  const originalErr = console.error;
  const originalWarn = console.warn;

  console.log = (...args) => { originalLog(...args); print("[LOG]", ...args); };
  console.error = (...args) => { originalErr(...args); print("[ERR]", ...args); };
  console.warn = (...args) => { originalWarn(...args); print("[WARN]", ...args); };

  window.onerror = function (msg, url, lineNo, columnNo, error) {
    print("[ONERROR]", msg, "line:", lineNo, "col:", columnNo);
  };

  console.log("console prête");
})();

var engine,
  scene,
  engineMat,
  mats,
  canvas = null;
let placed,
  placeRequest = false;
let time = 0;

// check for webxr session support
if ("xr" in navigator) {
    console.log("coucou 2")
  navigator.xr.isSessionSupported("immersive-ar").then((supported) => {
    if (supported) {
        console.log("supporté")
      //hide "ar-not-supported"
      init();
    }
    else{
            console.log("pas supporté")
    }
  });
}


const init = async () => {
  
  canvas = document.getElementById("renderCanvas");
  
  console.log(fetch("/assets/model.glb").then(r => console.log(r.headers.get("content-type"))));

  engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    disableWebGL2Support: false,
  });

  engine.displayLoadingUI();

  scene = new BABYLON.Scene(engine);
  await createScene();

  engine.runRenderLoop(function () {
    if (scene && scene.activeCamera) {
      scene.render();
    }
  });

  // Resize
  window.addEventListener("resize", () => {
    if (!engine) return;
    engine.resize();
  });
};

const createScene = async () => {
  const camera = new BABYLON.ArcRotateCamera(
    "camera1",
    2,
    1,
    5,
    new BABYLON.Vector3(0.3, -0.5, 0),
    scene
  );

  // This attaches the camera to the canvas
  camera.attachControl(canvas, true);

  scene.environmentTexture = null;
  // This creates a light
  var light = new BABYLON.HemisphericLight(
    "light",
    new BABYLON.Vector3(1, -1, 1),
    scene
  );

  // Default intensity is 1. Let's dim the light a small amount
  light.intensity = 0.5;

  var xr = await scene.createDefaultXRExperienceAsync({
    uiOptions: {
      sessionMode: "immersive-ar",
    },
    optionalFeatures: ['hit-test', 'anchors']
  });

  //remove VR laser pointers for AR
  xr.pointerSelection.displayLaserPointer = false;
  xr.pointerSelection.displaySelectionMesh = false;

  const fm = xr.baseExperience.featuresManager;
  const sm = xr.baseExperience.sessionManager;

  // enable hit test
  const hitTest = fm.enableFeature(BABYLON.WebXRHitTest, "latest");
  const anchorSystem = fm.enableFeature(BABYLON.WebXRAnchorSystem, "latest", { doNotRemoveAnchorsOnSessionEnded: true });

  let lastHitTest;

var box = BABYLON.MeshBuilder.CreateBox("box", {size: 0.5}, scene);
box.rotationQuaternion = new BABYLON.Quaternion();
box.isVisible = false

const dot = BABYLON.SphereBuilder.CreateSphere(
  "dot",
  {
    diameter: 0.05,
  },
  scene,
);
dot.isVisible = false;
hitTest.onHitTestResultObservable.add((results) => {
  if (results.length) {
    dot.isVisible = true;
    box.isVisible = true
    results[0].transformationMatrix.decompose(box.scaling, box.rotationQuaternion, box.position);
    lastHitTest = results[0]
  } else {
    dot.isVisible = false;
    box.isVisible = true
  }
});

const root = new BABYLON.TransformNode("root", scene);
box.parent = root;


  anchorSystem.onAnchorAddedObservable.add(anchor => {
    anchor.attachedNode = root;
  })

  scene.onPointerDown = (evt, pickInfo) => {
    if(hitTest && anchors) {
      anchorSystem.addAnchorPointUsingHitTestResultAsync(hitTest)
    }
  }



}
