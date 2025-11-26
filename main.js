

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

    // -----------------------------
  // HUD CONSOLE
  // -----------------------------
  const consolePanel = BABYLON.MeshBuilder.CreatePlane("consolePanel", { width: 0.6, height: 0.35 }, scene);

  const adt = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(consolePanel, 1024, 768, false);
  adt.background = "black";

  const stack = new BABYLON.GUI.StackPanel();
  stack.isVertical = true;
  adt.addControl(stack);

  const scroll = new BABYLON.GUI.ScrollViewer();
  scroll.width = 1;
  scroll.height = "640px";
  scroll.background = "#000";
  scroll.barColor = "white";
  scroll.thickness = 3;
  stack.addControl(scroll);

  const textBlock = new BABYLON.GUI.TextBlock();
  textBlock.color = "white";
  textBlock.textWrapping = true;
  textBlock.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  textBlock.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  textBlock.fontSize = 28;
  textBlock.paddingLeft = "10px";
  textBlock.paddingTop = "10px";
  scroll.addControl(textBlock);

  // buffer de logs
  let buffer = [];
  const maxLines = 200;
  function renderLogs() {
    textBlock.text = buffer.join("\n");
    scroll.verticalBar.value = scroll.verticalBar.maximum; // auto-scroll
  }

  // override console.log
  const originalLog = console.log;
  console.log = (...args) => {
    originalLog(...args);
    const line = args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
    buffer.push(line);
    if (buffer.length > maxLines) buffer.splice(0, buffer.length - maxLines);
    renderLogs();
  };

  // bouton clear
  const btnClear = BABYLON.GUI.Button.CreateSimpleButton("clearBtn", "Clear");
  btnClear.width = "160px";
  btnClear.height = "50px";
  btnClear.color = "white";
  btnClear.background = "#333";
  btnClear.onPointerUpObservable.add(() => { buffer = []; renderLogs(); });
  stack.addControl(btnClear);

  // -----------------------------
  // Position HUD : toujours devant la caméra
  // -----------------------------
  scene.onBeforeRenderObservable.add(() => {
    const forward = camera.getForwardRay().direction;
    const targetPos = camera.position.add(forward.scale(0.6)); // distance ~60cm
    consolePanel.position.copyFrom(targetPos);
    consolePanel.lookAt(camera.position, 0, 0, 0);
  });

  console.log("Console HUD AR initialisée !");
  

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
