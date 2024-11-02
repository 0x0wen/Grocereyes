import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Camera } from "expo-camera";
import * as tf from "@tensorflow/tfjs";
import * as ScreenOrientation from "expo-screen-orientation";
import {
  bundleResourceIO,
  cameraWithTensors,
} from "@tensorflow/tfjs-react-native";
import Svg, { Circle } from "react-native-svg";
import { ExpoWebGLRenderingContext } from "expo-gl";
import { CameraType } from "expo-camera/build/Camera.types";
import Button from "../components/Button";
import { speak } from "../helpers/accessibility";
import { detect, DetectionModel, detectTensor } from "../helpers/detection";

// Initialize TensorCamera
const TensorCamera = cameraWithTensors(Camera);

// Platform checks
const IS_ANDROID = Platform.OS === "android";
const IS_IOS = Platform.OS === "ios";

// Camera texture dimensions
const texture = IS_ANDROID
  ? { height: 1200, width: 1600 }
  : { height: 1920, width: 1080 };

// Camera preview dimensions
const CAM_PREVIEW_WIDTH = Dimensions.get("window").width;
const CAM_PREVIEW_HEIGHT = CAM_PREVIEW_WIDTH / (IS_IOS ? 9 / 16 : 3 / 4);

// Constants
const MIN_KEYPOINT_SCORE = 0.3;
const OUTPUT_TENSOR_WIDTH = 180;
const OUTPUT_TENSOR_HEIGHT = OUTPUT_TENSOR_WIDTH / (IS_IOS ? 9 / 16 : 3 / 4);
const AUTO_RENDER = true;
const LOAD_MODEL_FROM_BUNDLE = false;

export default function Grocersee() {
  const cameraRef = useRef(null);
  const [tfReady, setTfReady] = useState(false);
  const [model, setModel] = useState({
    net: null as tf.GraphModel | null,
    inputShape: [1, 0, 0, 3],
  });
  const [detection, setDetection] = useState<string>("");
  const [orientation, setOrientation] =
    useState<ScreenOrientation.Orientation>();
  const [cameraType, setCameraType] = useState<CameraType>(CameraType.front);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    async function prepare() {
      rafId.current = null;

      try {
        console.log("Starting initialization...");

        const modelJson = require("../../model/model.json");
        const modelWeights1 = require("../../model/group1-shard1of3.bin");
        const modelWeights2 = require("../../model/group1-shard2of3.bin");
        const modelWeights3 = require("../../model/group1-shard3of3.bin");
        const modelUrl = bundleResourceIO(modelJson, [
          modelWeights1,
          modelWeights2,
          modelWeights3,
        ]);

        // Initialize TensorFlow.js
        tf.ready().then(async () => {
          const yolo11 = await tf.loadGraphModel(modelUrl);

          const dummyInput = tf.ones(yolo11.inputs[0].shape as number[]);
          const warmupResults = yolo11.execute(dummyInput);

          console.log("Model loaded successfully");
          setModel({
            net: yolo11,
            inputShape: yolo11.inputs[0].shape as number[],
          });

          setTfReady(true);

          console.log("TF.js ready");

          tf.dispose([warmupResults, dummyInput]); // cleanup memory
        });

        // Request camera permissions first
        const { status } = await Camera.requestCameraPermissionsAsync();
        if (status !== "granted") {
          console.error("Camera permission not granted");
          return;
        }
        console.log("Camera permission granted");

        // Set orientation
        const curOrientation = await ScreenOrientation.getOrientationAsync();
        setOrientation(curOrientation);

        // Orientation change listener
        ScreenOrientation.addOrientationChangeListener((event) => {
          setOrientation(event.orientationInfo.orientation);
        });
      } catch (error) {
        console.error("Error in prepare:", error);
      }
    }

    prepare();

    return () => {
      if (rafId.current != null && rafId.current !== 0) {
        cancelAnimationFrame(rafId.current);
        rafId.current = 0;
      }
    };
  }, []);

  const handleCameraStream = async (
    images: IterableIterator<tf.Tensor3D>,
    updatePreview: () => void,
    gl: ExpoWebGLRenderingContext
  ) => {
    const loop = async () => {
      if (!model.net) {
        console.log("Model not loaded yet");
        rafId.current = requestAnimationFrame(loop);
        return;
      }

      console.log("Processing camera stream...");

      try {
        const imageTensor = images.next().value;

        if (!imageTensor) {
          console.log("No image tensor received");
          rafId.current = requestAnimationFrame(loop);
          return;
        }

        const startTs = Date.now();

        // Process the tensor directly
        const processedTensor = tf.tidy(() => {
          // Normalize and resize the tensor if needed
          return imageTensor.expandDims(0).div(255.0);
        });

        // Run detection directly with the tensor
        if (model.net) {
          const result = await detectTensor(
            processedTensor,
            model as DetectionModel
          );

          // Log and handle detection results
          if (result) {
            console.log("Detection Result:", result);
            setDetection(result); // Store the result in state if needed
          }
        }

        const latency = Date.now() - startTs;
        console.log("Detection latency:", latency, "ms");

        // Cleanup tensors
        tf.dispose([imageTensor, processedTensor]);

        if (rafId.current === 0) {
          return;
        }

        if (!AUTO_RENDER) {
          updatePreview();
          gl.endFrameEXP();
        }
      } catch (error) {
        console.error("Error in camera stream loop:", error);
      }

      rafId.current = requestAnimationFrame(loop);
    };

    loop();
  };

  const renderCameraTypeSwitcher = () => (
    <TouchableOpacity
      style={styles.cameraTypeSwitcher}
      onPress={handleSwitchCameraType}
    >
      <Text>
        Switch to {cameraType === CameraType.front ? "back" : "front"} camera
      </Text>
    </TouchableOpacity>
  );

  const handleSwitchCameraType = () => {
    console.log("Switching camera from:", cameraType);
    setCameraType((currentType) =>
      currentType === CameraType.front ? CameraType.back : CameraType.front
    );
  };

  const isPortrait = () => {
    return (
      orientation === ScreenOrientation.Orientation.PORTRAIT_UP ||
      orientation === ScreenOrientation.Orientation.PORTRAIT_DOWN
    );
  };

  const getOutputTensorWidth = () => {
    return isPortrait() || IS_ANDROID
      ? OUTPUT_TENSOR_WIDTH
      : OUTPUT_TENSOR_HEIGHT;
  };

  const getOutputTensorHeight = () => {
    return isPortrait() || IS_ANDROID
      ? OUTPUT_TENSOR_HEIGHT
      : OUTPUT_TENSOR_WIDTH;
  };

  const getTextureRotationAngleInDegrees = () => {
    if (IS_ANDROID) {
      return 0;
    }

    switch (orientation) {
      case ScreenOrientation.Orientation.PORTRAIT_DOWN:
        return 180;
      case ScreenOrientation.Orientation.LANDSCAPE_LEFT:
        return cameraType === CameraType.front ? 270 : 90;
      case ScreenOrientation.Orientation.LANDSCAPE_RIGHT:
        return cameraType === CameraType.front ? 90 : 270;
      default:
        return 0;
    }
  };

  if (!tfReady) {
    return (
      <View style={styles.loadingMsg}>
        <Text>Loading TensorFlow...</Text>
      </View>
    );
  }

  return (
    <View
      style={
        isPortrait() ? styles.containerPortrait : styles.containerLandscape
      }
    >
      <TensorCamera
        ref={cameraRef}
        style={styles.camera}
        autorender={AUTO_RENDER}
        type={cameraType}
        resizeWidth={getOutputTensorWidth()}
        resizeHeight={getOutputTensorHeight()}
        resizeDepth={3}
        rotation={getTextureRotationAngleInDegrees()}
        onReady={handleCameraStream}
        useCustomShadersToResize={false}
        cameraTextureWidth={texture.width}
        cameraTextureHeight={texture.height}
      />
      {renderCameraTypeSwitcher()}
      <Button
        onSingleClick={() =>
          speak(
            "Anda dapat mengarahkan kamera anda ke rak dengan beberapa barang ataupun ke satu barang yang anda pegang untuk mendapatkan audio feedback terkait apa yang terlihat."
          )
        }
        onDoubleClick={() => console.log("Button is clicked twice!")}
        onTripleClick={() => console.log("Button is clicked three times!")}
        icon={{ name: "question", size: 40 }}
        style={{
          button: {
            backgroundColor: "#000000",
            position: "absolute",
            bottom: 30,
            right: 30,
            padding: 20,
            borderRadius: 100,
          },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  containerPortrait: {
    position: "relative",
    width: CAM_PREVIEW_WIDTH,
    height: CAM_PREVIEW_HEIGHT,
    marginTop: Dimensions.get("window").height / 2 - CAM_PREVIEW_HEIGHT / 2,
  },
  containerLandscape: {
    position: "relative",
    width: CAM_PREVIEW_HEIGHT,
    height: CAM_PREVIEW_WIDTH,
    marginLeft: Dimensions.get("window").height / 2 - CAM_PREVIEW_HEIGHT / 2,
  },
  loadingMsg: {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  camera: {
    width: "100%",
    height: "100%",
    zIndex: 1,
  },
  svg: {
    width: "100%",
    height: "100%",
    position: "absolute",
    zIndex: 30,
  },
  fpsContainer: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 80,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, .7)",
    borderRadius: 2,
    padding: 8,
    zIndex: 20,
  },
  cameraTypeSwitcher: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 180,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, .7)",
    borderRadius: 2,
    padding: 8,
    zIndex: 20,
    elevation: 3, // Add elevation for Android
  },
});
