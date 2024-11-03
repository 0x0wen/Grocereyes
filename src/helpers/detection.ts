import * as tf from "@tensorflow/tfjs";
import { KMeansShoppingAssistant } from "./filtering";

export type DetectionModel = {
  net: tf.GraphModel;
  inputShape: number[];
};

interface DetectionBoxes {
  boxes: tf.Tensor2D;
  scores: tf.Tensor1D;
  classes: tf.Tensor1D;
}

export const labels: string[] = [
  "daun_salam",
  "daging_sapi",
  "paprika",
  "kubis",
  "wortel",
  "kembang_kol",
  "ayam",
  "kacang_arab",
  "ketumbar",
  "mentimun",
  "telur",
  "terong",
  "ikan",
  "bawang_putih",
  "jahe",
  "cabai_hijau",
  "daun_bawang",
  "jeruk_kumquat",
  "lemon",
  "daging_kambing",
  "okra",
  "bawang_merah",
  "daging_babi",
  "kentang",
  "labu",
  "lobak",
  "garam",
  "udang",
  "cabai_kecil",
  "tahu",
  "tomat",
  "kunyit",
];

// const numClass: number = labels.length;

const preprocess = (
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  modelWidth: number,
  modelHeight: number
): [tf.Tensor4D, number, number] => {
  let xRatio: number = 1,
    yRatio: number = 1;

  const input: tf.Tensor4D = tf.tidy(() => {
    const img = tf.browser.fromPixels(source);
    const [h, w] = img.shape.slice(0, 2);
    const maxSize = Math.max(w, h);
    const imgPadded = img.pad([
      [0, maxSize - h],
      [0, maxSize - w],
      [0, 0],
    ]);

    xRatio = maxSize / w;
    yRatio = maxSize / h;

    return tf.image
      .resizeBilinear(imgPadded as tf.Tensor3D, [modelWidth, modelHeight])
      .div(255.0)
      .expandDims(0) as tf.Tensor4D;
  });

  return [input, xRatio, yRatio];
};

export const detect = async (
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  model: DetectionModel,
  _canvasRef: HTMLCanvasElement,
  callback: () => void = () => {}
): Promise<string> => {
  const [modelWidth, modelHeight] = model.inputShape.slice(1, 3);

  tf.engine().startScope();
  const [input] = preprocess(source, modelWidth, modelHeight);

  const res: tf.Tensor = model.net.execute(input) as tf.Tensor;
  console.log("Model output shape:", res.shape);

  // For YOLOv8 output format [1, 36, 8400]
  const boxes: DetectionBoxes = tf.tidy(() => {
    // First 4 elements are x, y, w, h
    const bboxes = res.slice([0, 0, 0], [1, 4, -1]);
    const scores = res.slice([0, 4, 0], [1, -1, -1]);

    // Transpose boxes to [batch, detection, coords]
    const bboxesReshaped = bboxes.transpose([0, 2, 1]);
    const scoresReshaped = scores.transpose([0, 2, 1]);

    // Get confidence scores and class indices
    const classScores = scoresReshaped.max(2);
    const classIndices = scoresReshaped.argMax(2);

    // Process boxes
    const bboxData = bboxesReshaped.squeeze();
    const x = bboxData.slice([0, 0], [-1, 1]);
    const y = bboxData.slice([0, 1], [-1, 1]);
    const w = bboxData.slice([0, 2], [-1, 1]);
    const h = bboxData.slice([0, 3], [-1, 1]);

    // Convert xywh to xyxy format
    const x1 = tf.sub(x, tf.div(w, 2));
    const y1 = tf.sub(y, tf.div(h, 2));
    const x2 = tf.add(x1, w);
    const y2 = tf.add(y1, h);

    return {
      boxes: tf.concat([y1, x1, y2, x2], 1) as tf.Tensor2D,
      scores: classScores.squeeze() as tf.Tensor1D,
      classes: classIndices.squeeze() as tf.Tensor1D,
    };
  });

  // Add this debug code
  const scoresBeforeNMS = await boxes.scores.data();
  const boxesBeforeNMS = await boxes.boxes.data();
  console.log("Scores before NMS:", scoresBeforeNMS.slice(0, 10));
  console.log("Boxes before NMS:", boxesBeforeNMS.slice(0, 10));

  // Apply non-max suppression
  const nms = await tf.image.nonMaxSuppressionAsync(
    boxes.boxes as tf.Tensor2D,
    boxes.scores,
    500,
    0.3,
    0.2
  );

  // Gather the surviving detection indices
  const scores_data = Array.from(boxes.scores.gather(nms).dataSync());
  const boxes_data = boxes.boxes.gather(nms, 0).dataSync();
  const boxes_matrix = [];
  for (let i = 0; i < boxes_data.length; i += 4) {
    let box = [];
    for (let j = 0; j < 4; j++) {
      box.push(Number(boxes_data[i + j]));
    }
    boxes_matrix.push(box);
  }
  const classes_data = Array.from(boxes.classes.gather(nms, 0).dataSync());

  // convert classes_data into array of string from label
  const classes_data_label: string[] = classes_data.map(
    (index) => labels[index]
  );

  console.log("Detected classes:", classes_data_label);
  console.log("Detected scores:", scores_data);

  const assistant = new KMeansShoppingAssistant(640, 480);
  const result = assistant.processFrame(
    boxes_matrix,
    classes_data_label,
    scores_data
  );

  tf.dispose([res, boxes.boxes, boxes.scores, boxes.classes, nms]);

  callback();
  tf.engine().endScope();

  return result;
};

export const detectVideo = (
  vidSource: HTMLVideoElement,
  model: DetectionModel,
  canvasRef: HTMLCanvasElement
): void => {
  const detectFrame = async (): Promise<void> => {
    if (vidSource.videoWidth === 0 && vidSource.srcObject === null) {
      const ctx = canvasRef.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      }
      return;
    }

    detect(vidSource, model, canvasRef, () => {
      requestAnimationFrame(detectFrame);
    });
  };

  detectFrame();
};

interface DetectionResult {
  boxes: Float32Array;
  scores: Float32Array;
  classes: Float32Array;
  originalSize: {
    width: number;
    height: number;
  };
}

interface BoxPredictions {
  boxes: tf.Tensor;
  scores: tf.Tensor1D;
  classes: tf.Tensor1D;
}

export const detectTensor = async (
  inputTensor: tf.Tensor3D | tf.Tensor4D,
  model: DetectionModel
): Promise<string> => {
  const [modelWidth, modelHeight] = model.inputShape.slice(1, 3);

  tf.engine().startScope();

  const processedTensor = inputTensor;

  // const processedTensor = tf.tidy(() => {
  //   let resized = inputTensor;
  //   if (
  //     inputTensor.shape[1] !== modelWidth ||
  //     inputTensor.shape[2] !== modelHeight
  //   ) {
  //     resized = tf.image.resizeBilinear(inputTensor, [modelWidth, modelHeight]);
  //   }

  //   return resized.expandDims(0).div(255.0) as tf.Tensor4D;
  // });

  const originalWidth = inputTensor.shape[1];
  const originalHeight = inputTensor.shape[2];

  // Add padding logic here
  // const processedTensor: tf.Tensor4D = tf.tidy((): tf.Tensor4D => {
  //   // Get original dimensions
  //   const [h, w] = inputTensor.shape.slice(0, 2);
  //   const maxSize = Math.max(w, h);

  //   // Pad the image to make it square
  //   const paddedTensor = inputTensor.pad([
  //     [0, maxSize - h], // Padding for height
  //     [0, maxSize - w], // Padding for width
  //     [0, 0], // No padding for channels
  //   ]);

  //   // Now resize the square padded image
  //   const resized = tf.image.resizeBilinear(paddedTensor as tf.Tensor3D, [
  //     modelWidth,
  //     modelHeight,
  //   ]);

  //   // Add batch dimension and normalize
  //   return resized.expandDims(0).div(255.0);

  const res: tf.Tensor = model.net.execute(processedTensor) as tf.Tensor;

  const boxes: BoxPredictions = tf.tidy(() => {
    const bboxes: tf.Tensor = res.slice([0, 0, 0], [1, 4, -1]);
    const scores: tf.Tensor = res.slice([0, 4, 0], [1, -1, -1]);
    const bboxesReshaped: tf.Tensor = bboxes.transpose([0, 2, 1]);
    const scoresReshaped: tf.Tensor = scores.transpose([0, 2, 1]);
    const classScores: tf.Tensor = scoresReshaped.max(2);
    const classIndices: tf.Tensor = scoresReshaped.argMax(2);
    const bboxData: tf.Tensor = bboxesReshaped.squeeze();

    const x: tf.Tensor = bboxData.slice([0, 0], [-1, 1]);
    const y: tf.Tensor = bboxData.slice([0, 1], [-1, 1]);
    const w: tf.Tensor = bboxData.slice([0, 2], [-1, 1]);
    const h: tf.Tensor = bboxData.slice([0, 3], [-1, 1]);

    const x1: tf.Tensor = tf.sub(x, tf.div(w, 2));
    const y1: tf.Tensor = tf.sub(y, tf.div(h, 2));
    const x2: tf.Tensor = tf.add(x1, w);
    const y2: tf.Tensor = tf.add(y1, h);

    return {
      boxes: tf.concat([y1, x1, y2, x2], 1),
      scores: classScores.squeeze() as tf.Tensor1D,
      classes: classIndices.squeeze() as tf.Tensor1D,
    };
  });

  const nms: tf.Tensor1D = await tf.image.nonMaxSuppressionAsync(
    boxes.boxes as tf.Tensor2D,
    boxes.scores,
    100, // Reduced from 500 to 200 to be more strict
    0.3, // IOU threshold
    0.5 // Score threshold
  );

  // Debug logging after NMS
  const scores_data = Array.from(boxes.scores.gather(nms).dataSync());
  const boxes_data = boxes.boxes.gather(nms, 0).dataSync();
  const classes_data = Array.from(boxes.classes.gather(nms, 0).dataSync());

  const boxes_matrix = [];
  for (let i = 0; i < boxes_data.length; i += 4) {
    let box = [];
    for (let j = 0; j < 4; j++) {
      box.push(Number(boxes_data[i + j]));
    }
    boxes_matrix.push(box);
  }

  const classes_data_label: string[] = classes_data.map(
    (index) => labels[index]
  );

  console.log("Detected classes:", classes_data_label);
  // console.log("Detected scores:", scores_data);

  const assistant = new KMeansShoppingAssistant(640, 480);
  const result = assistant.processFrame(
    boxes_matrix,
    classes_data_label,
    scores_data
  );

  tf.dispose([
    res,
    processedTensor,
    boxes.boxes,
    boxes.scores,
    boxes.classes,
    nms,
  ]);

  tf.engine().endScope();

  return result;
};
