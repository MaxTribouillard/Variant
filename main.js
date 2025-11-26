

var engine, scene, engineMat, mats, canvas = null;
let placed, placeRequest = false;
let time = 0;

// Console de debug pour WebXR AR
let arConsole = null;

function initARConsole() {
  // Créer la console de debug si elle n'existe pas
  if (!document.getElementById("ar-debug-console")) {
    const console = document.createElement("div");
    console.id = "ar-debug-console";
    console.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: 300px;
      height: 200px;
      background: rgba(0,0,0,0.8);
      color: #00ff00;
      font-family: monospace;
      font-size: 12px;
      border-radius: 5px;
      padding: 10px;
      overflow-y: auto;
      z-index: 999999;
      display: none;
      border: 1px solid #333;
    `;
    document.body.appendChild(console);
    arConsole = console;
  }
  return arConsole;
}

function logToAR(message) {
  if (!arConsole) return;
  const timestamp = new Date().toLocaleTimeString();
  arConsole.innerHTML += `[${timestamp}] ${message}<br>`;
  arConsole.scrollTop = arConsole.scrollHeight;
}

function showARConsole() {
  if (arConsole) {
    arConsole.style.display = "block";
    logToAR("Console AR activée");
  }
}

function hideARConsole() {
  if (arConsole) {
    arConsole.style.display = "none";
  }
}

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

  // Initialiser la console AR
  initARConsole();

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
    domOverlay: { root: document.body }
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
  // Vérifier que les éléments DOM existent
  const consoleEl = document.getElementById("xr-console");
  const logEl = document.getElementById("xr-log");
  const clearBtn = document.getElementById("xr-clear");

  if (!consoleEl || !logEl || !clearBtn) {
    console.error("Éléments de console manquants dans le DOM");
    return;
  }

  // buffer + rendu
  let buffer = [];
  const maxLines = 300;
  let pending = false;

  function renderLogs() {
    pending = false;
    if (logEl) {
      logEl.textContent = buffer.join("\n");
      // auto-scroll en bas
      logEl.scrollTop = logEl.scrollHeight;
    }
  }

  // patch console.log/warn/error
  const origLog = console.log, origWarn = console.warn, origErr = console.error;

  function pushLine(tag, args) {
    const ts = new Date().toISOString().split("T")[1].replace("Z", "");
    const txt = args.map(a => {
      try { 
        return typeof a === "object" ? JSON.stringify(a) : String(a); 
      } catch { 
        return String(a); 
      }
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

  if (clearBtn) {
    clearBtn.addEventListener("click", () => { buffer = []; renderLogs(); });
  }

  // Gestion des sessions XR
  xr.baseExperience.sessionManager.onXRSessionInit.add(() => {
    console.log("Session AR initiée");
    logToAR("Session WebXR AR démarrée");
    showARConsole();
    
    if (consoleEl) {
      consoleEl.style.display = "block";
    }
  });

  xr.baseExperience.sessionManager.onXRSessionEnded.add(() => {
    console.log("Session AR terminée");
    logToAR("Session WebXR AR terminée");
    hideARConsole();
    
    if (consoleEl) {
      consoleEl.style.display = "none";
    }
  });

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
