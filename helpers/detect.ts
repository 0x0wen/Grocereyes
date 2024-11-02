import * as tf from "@tensorflow/tfjs";
import labels from "./labels.json";

const numClass = labels.length;

const preprocess = (source, modelWidth, modelHeight) => {
  let xRatio, yRatio;

  const input = tf.tidy(() => {
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
      .resizeBilinear(imgPadded, [modelWidth, modelHeight])
      .div(255.0)
      .expandDims(0);
  });

  return [input, xRatio, yRatio];
};

export const detect = async (source, model, canvasRef, callback = () => {}) => {
  const [modelWidth, modelHeight] = model.inputShape.slice(1, 3);

  tf.engine().startScope();
  const [input, xRatio, yRatio] = preprocess(source, modelWidth, modelHeight);

  const res = model.net.execute(input);
  console.log("Model output shape:", res.shape);

  // For YOLOv8 output format [1, 36, 8400]
  const boxes = tf.tidy(() => {
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
      boxes: tf.concat([y1, x1, y2, x2], 1),
      scores: classScores.squeeze(),
      classes: classIndices.squeeze(),
    };
  });

  // Apply non-max suppression
  const nms = await tf.image.nonMaxSuppressionAsync(
    boxes.boxes,
    boxes.scores,
    500,
    0.3,
    0.2,
  );

  // Gather the surviving detection indices
  const classes_data = boxes.classes.gather(nms, 0).dataSync();

  classes_data.forEach((classIndex, i) => {
    console.log(
      `Detected class: ${labels[classIndex]} with score: ${boxes.scores.gather(nms, 0).dataSync()[i]}`,
    );
  });

  tf.dispose([res, boxes.boxes, boxes.scores, boxes.classes, nms]);

  callback();
  tf.engine().endScope();
};

export const detectVideo = (vidSource, model, canvasRef) => {
  const detectFrame = async () => {
    if (vidSource.videoWidth === 0 && vidSource.srcObject === null) {
      const ctx = canvasRef.getContext("2d");
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      return;
    }

    detect(vidSource, model, canvasRef, () => {
      requestAnimationFrame(detectFrame);
    });
  };

  detectFrame();
};