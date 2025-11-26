

var engine, scene, engineMat, mats, canvas = null;
let placed, placeRequest = false;
let time = 0;

// check for webxr session support
if ("xr" in navigator) {
  console.log("coucou 2");
  navigator.xr.isSessionSupported("immersive-ar").then((supported) => {
    if (supported) {
      console.log("supporté");
      // hide "ar-not-supported"
      init();
    } else {
      console.log("pas supporté");
    }
  });
}

const init = async () => {
  canvas = document.getElementById("renderCanvas");

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
    optionalFeatures: ["hit-test", "anchors", "dom-overlay"],
    domOverlay: {root: document.body}
  });

  // remove VR laser pointers for AR
  xr.pointerSelection.displayLaserPointer = false;
  xr.pointerSelection.displaySelectionMesh = false;

  const fm = xr.baseExperience.featuresManager;
  const sm = xr.baseExperience.sessionManager;

  // enable hit test
  const hitTest = fm.enableFeature(BABYLON.WebXRHitTest, "latest");
  const anchorSystem = fm.enableFeature(
    BABYLON.WebXRAnchorSystem,
    "latest"
  );

  console.log("test")

  let lastHitTest;
  let placed = false;

  const root = new BABYLON.TransformNode("root", scene);

  var box = BABYLON.MeshBuilder.CreateBox("box", { size: 0.5 }, scene);
  box.rotationQuaternion = new BABYLON.Quaternion();

  hitTest.onHitTestResultObservable.add((results) => {
    if (results.length) {
      lastHitTest = results[0];
      if(!placed){

        results[0].transformationMatrix.decompose(
          box.scaling,
          box.rotationQuaternion,
          box.position
        );

      }
    } 
    else {
      // no results
    }
  });

// ---- DOM OVERLAY CONSOLE ----
const consoleEl = document.getElementById("xr-console");
const logEl = document.getElementById("xr-log");
const clearBtn = document.getElementById("xr-clear");

// afficher l'overlay quand la session AR démarre
xr.baseExperience.sessionManager.onXRSessionInit.add(() => {
  consoleEl.style.display = "block";
});
// masquer quand la session se termine
xr.baseExperience.sessionManager.onXRSessionEnded.add(() => {
  consoleEl.style.display = "none";
});

// buffer + rendu
let buffer = [];
const maxLines = 300;
let pending = false;

function renderLogs() {
  pending = false;
  logEl.textContent = buffer.join("\n");
  // auto-scroll en bas
  logEl.scrollTop = logEl.scrollHeight;
}

// patch console.log/warn/error
const origLog = console.log, origWarn = console.warn, origErr = console.error;

function pushLine(tag, args, color) {
  const ts = new Date().toISOString().split("T")[1].replace("Z", "");
  const txt = args.map(a => {
    try { return typeof a === "object" ? JSON.stringify(a) : String(a); }
    catch { return String(a); }
  }).join(" ");
  buffer.push(`[${ts}] ${tag}: ${txt}`);
  if (buffer.length > maxLines) buffer.splice(0, buffer.length - maxLines);
  // throttle pour ne pas rerendre à chaque log
  if (!pending) {
    pending = true;
    requestAnimationFrame(renderLogs);
  }
}

console.log = (...args) => { origLog(...args); pushLine("LOG", args); };
console.warn = (...args) => { origWarn(...args); pushLine("WARN", args); };
console.error = (...args) => { origErr(...args); pushLine("ERROR", args); };

clearBtn.addEventListener("click", () => { buffer = []; renderLogs(); });

console.log("Console AR (DOM overlay) initialisée");
  

//     var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

//     var button = BABYLON.GUI.Button.CreateSimpleButton("but", "Click Me");
//     button.width = 0.2;
//     button.height = "40px";
//     button.color = "white";
//     button.background = "green";
//     advancedTexture.addControl(button); 
    
  //   anchorSystem.onAnchorAddedObservable.add((anchor) => {
  //         anchor.attachedNode = box;
  //   });

  //   button.onPointerDownObservable.add(function() {
        
  //       placed = true;
  //       anchorSystem.addAnchorPointUsingHitTestResultAsync(lastHitTest);
    
  // });
};
