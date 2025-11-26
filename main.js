

var engine, scene, engineMat, mats, canvas = null;
let placed, placeRequest = false;
let time = 0;

// Console de debug - utilise la console fixe en bas de l'écran
function debugLog(message, type = 'info') {
  if (window.debugLog) {
    window.debugLog(message, type);
  } else {
    console.log(message);
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

  debugLog("Initialisation de Babylon.js...", 'info');

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

  debugLog("Configuration WebXR AR...", 'info');
  
  var xr = await scene.createDefaultXRExperienceAsync({
    uiOptions: {
      sessionMode: "immersive-ar",
    },
    optionalFeatures: ["hit-test", "anchors"]
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
    "latest",
    { doNotRemoveAnchorsOnSessionEnded: true }
  );

  debugLog("Hit test et anchors activés", 'success');

  let lastHitTest;
  let placed = false;

  const root = new BABYLON.TransformNode("root", scene);

  var box = BABYLON.MeshBuilder.CreateBox("box", { size: 0.5 }, scene);
  box.rotationQuaternion = new BABYLON.Quaternion();
  box.isVisible = false;
  box.parent = root;

  hitTest.onHitTestResultObservable.add((results) => {
    if (results.length) {
      results[0].transformationMatrix.decompose(
        root.scaling,
        root.rotationQuaternion,
        root.position
      );
      lastHitTest = results[0];
    } else {
      // no results
    }
  });

  anchorSystem.onAnchorAddedObservable.add((anchor) => {
    debugLog("Anchor ajouté!", 'success');
    anchor.attachedNode = box;
    box.isVisible = true;
  });

  document.addEventListener("pointerdown", () => {
    if (lastHitTest) {
      debugLog("Tentative de placement d'anchor...", 'info');
      anchorSystem.addAnchorPointUsingHitTestResultAsync(lastHitTest);
    }
  });

  // Gestion des sessions XR
  xr.baseExperience.sessionManager.onXRSessionInit.add(() => {
    debugLog("Session WebXR AR démarrée", 'success');
  });

  xr.baseExperience.sessionManager.onXRSessionEnded.add(() => {
    debugLog("Session WebXR AR terminée", 'warn');
  });

  debugLog("Scene WebXR configurée avec succès", 'success');
  

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
