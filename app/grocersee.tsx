import { StyleSheet } from "react-native";
import { View } from "react-native";
import { Text } from "react-native";
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as tf from '@tensorflow/tfjs';
import { useState,useRef,useEffect } from "react";
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';
import Button from "./(components)/Button";
import { decodeJpeg } from '@tensorflow/tfjs-react-native';
import { Asset } from 'expo-asset';
import { ModelJSON } from '@tensorflow/tfjs-core/dist/io/types';

export default function TabTwoScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [isModelReady, setIsModelReady] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);

  const getTensor = async () =>{
    try {
      // First, require the files
      const modelJSON = require('../assets/model/model.json');
      const modelWeights = [
        require('../assets/model/group1-shard1of3.bin'),
        require('../assets/model/group1-shard2of3.bin'),
        require('../assets/model/group1-shard3of3.bin')
      ];

      // Load the JSON file content
      const modelJSONAsset = Asset.fromModule(modelJSON);
      await modelJSONAsset.downloadAsync();
      
      // Parse the JSON content
      const modelJSONContent = await fetch(modelJSONAsset.localUri!).then(r => r.json()) as ModelJSON;

      // Convert weight assets to the correct format (numbers)
      const weightAssets = modelWeights.map((weight) => {
        // The require function returns a number for static assets
        return weight as number;
      });

      // Load the model using bundleResourceIO
      const model = await tf.loadGraphModel(bundleResourceIO(
        modelJSONContent,
        weightAssets
      ));

      return model;
    } catch (error) {
      console.error('Error loading model:', error);
      setModelLoadError(error instanceof Error ? error.message : 'Unknown error loading model');
      throw error;
    }
  };
  let model: tf.GraphModel | null = null;
  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} speech="grant permission" 
          icon={{ name: "check-circle", size: 40 }}
        />
      </View>
    );
  }
useEffect(() => {
    (async () => {
      
      await tf.ready(); // Wait for TensorFlow to initialize
      console.log('tensor is ready!');
      model = await getTensor();
      setIsModelReady(true);
    })();
  }, []);
  function toggleCameraFacing() {
    setFacing((current:string) => (current === 'back' ? 'front' : 'back'));
  }

  const captureAndProcessImage = async () => {
    if (cameraRef.current && model) {
      const photo = await cameraRef.current.takePictureAsync({ base64: true });

    // Convert base64 image to Uint8Array for TensorFlow processing
    const imageData = tf.util.encodeString(photo?.base64 || '', 'base64').buffer as ArrayBuffer;
    const uint8array = new Uint8Array(imageData);

    // Decode image into a tensor
    let imgTensor = decodeJpeg(uint8array);

    // Resize and normalize the image for model compatibility
    const resizedImage = tf.image.resizeBilinear(imgTensor, [416, 416]);
    const normalizedImage = resizedImage.div(tf.scalar(255)).expandDims(0); // Add batch dimension

    // Make predictions
    const predictions = await model.predict(normalizedImage) as tf.Tensor;
    console.log(predictions.arraySync());

      // Clean up tensors to free memory
      imgTensor.dispose();
      resizedImage.dispose();
      normalizedImage.dispose();
      predictions.dispose();
    }
  };
  return (
   
      <View style={styles.container}>
        <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <View style={styles.buttonContainer}>
        <Button speech="Capture and Process Image" onPress={captureAndProcessImage} 
        style={styles.button} icon={{ name: "rotate-cw", size: 40 }}
        />
      {/* <Button
        onPress={
          toggleCameraFacing
        }
        speech="Minggir lu miskin"
        style={styles.button}
        icon={{ name: "rotate-cw", size: 40 }}
      />           */}
        </View>
      </CameraView>
      <Button onPress={()=>console.log('info is clicked!')} icon={{name:'question', size:40}} style={{button:{backgroundColor:'#000000', position:'absolute',bottom:30,right:30, padding:20, borderRadius:'100%'}}} speech={'Anda dapat mengarahkan kamera anda ke rak dengan beberapa barang ataupun ke satu barang yang anda pegang untuk mendapatkan audio feedback terkait apa yang terlihat.'}/>
    </View>
  );
}

const styles = StyleSheet.create({
  camera: {
    flex: 1,
    height: 900,
  },
  headerImage: {
    color: "#808080",
    bottom: -90,
    left: -35,
    position: "absolute",
  },
  titleContainer: {
    flexDirection: "row",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },container: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
 
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: 'flex-end',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
});
